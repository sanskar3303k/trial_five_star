import 'dotenv/config';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ragAnswer } from './rag.mjs';
import { analyzeFeedback } from './sentiment.mjs';
import { pricingScenario, priceScenario } from './pricing.mjs';
import { sbInsert, sbSelect } from './supabase.mjs';
import { seedResortData } from './seedData.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(path.join(here, 'data'), { recursive: true });

// ── SQLite ────────────────────────────────────────────────────────────────────
const db = new DatabaseSync(process.env.DB_PATH || path.join(here, 'data', 'portal.sqlite'));
db.exec(`PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS users     (id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT, role TEXT, room TEXT, salt TEXT, password TEXT);
CREATE TABLE IF NOT EXISTS sessions  (token TEXT PRIMARY KEY, user_id TEXT, expires INTEGER);
CREATE TABLE IF NOT EXISTS requests  (id TEXT PRIMARY KEY, user_id TEXT, category TEXT, title TEXT, detail TEXT, total INTEGER, status TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS feedback  (id TEXT PRIMARY KEY, user_id TEXT, rating INTEGER, comment TEXT, analysis TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS rates     (id TEXT PRIMARY KEY, amount INTEGER, updated_at TEXT, updated_by TEXT);
CREATE TABLE IF NOT EXISTS concierge_logs (id TEXT PRIMARY KEY, user_id TEXT, question TEXT, answer TEXT, mode TEXT, model TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS pricing_logs   (id TEXT PRIMARY KEY, user_id TEXT, inputs TEXT, result TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS rooms     (
  room_number TEXT PRIMARY KEY, floor INTEGER, type TEXT, price_per_night INTEGER, status TEXT,
  guest_name TEXT, guest_age INTEGER, guest_gender TEXT, guest_email TEXT, guest_phone TEXT,
  check_in TEXT, check_out TEXT, guest_count INTEGER, vip_tier TEXT, special_requests TEXT, notes TEXT
);
CREATE TABLE IF NOT EXISTS maintenance_equipment (
  id TEXT PRIMARY KEY, name TEXT, location TEXT, type TEXT, status TEXT, health INTEGER,
  last_maintenance TEXT, next_due TEXT, failure_probability INTEGER, issue TEXT, estimated_cost TEXT
);
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id TEXT PRIMARY KEY, equipment_id TEXT, equipment_name TEXT, task TEXT, priority TEXT,
  technician TEXT, scheduled_date TEXT, duration TEXT, status TEXT, estimated_cost TEXT, notes TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS staff_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, role TEXT, department TEXT, status TEXT, shift TEXT,
  hours INTEGER, efficiency INTEGER, avatar TEXT, phone TEXT, email TEXT,
  experience_years INTEGER, assigned_area TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS staff_recommendations (
  id INTEGER PRIMARY KEY,
  type TEXT, title TEXT, description TEXT, impact TEXT, action TEXT, status TEXT
);
CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, category TEXT, stock REAL, unit TEXT, min_stock REAL, max_stock REAL,
  status TEXT, trend TEXT, demand REAL, cost REAL, supplier TEXT, last_restocked TEXT
);
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  supplier TEXT, items_count INTEGER, total_amount TEXT, numeric_amount INTEGER,
  status TEXT, expected_date TEXT, created_at TEXT, notes TEXT
);
CREATE TABLE IF NOT EXISTS inventory_insights (
  id INTEGER PRIMARY KEY,
  priority TEXT, title TEXT, description TEXT, recommendation TEXT, savings TEXT,
  status TEXT, action_type TEXT
);
CREATE TABLE IF NOT EXISTS revenue_calculations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT,
  calculation_data TEXT,
  daily_revenue INTEGER,
  weekly_revenue INTEGER,
  monthly_revenue INTEGER,
  created_at TEXT
);
`);


// ── Seed users & resort data ──────────────────────────────────────────────────
function seedUser(id, email, name, role, room, password) {
  if (db.prepare('SELECT id FROM users WHERE id = ?').get(id)) return;
  const salt = randomBytes(16).toString('hex');
  db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, email, name, role, room, salt, scryptSync(password, salt, 64).toString('hex'));
}
if (process.env.NODE_ENV === 'production' && (!process.env.GUEST_PASSWORD || !process.env.MANAGER_PASSWORD))
  throw new Error('Set GUEST_PASSWORD and MANAGER_PASSWORD before starting production server.');
seedUser('guest-1',   'guest@smartresort.demo',   'Alex Morgan',   'guest',   '204', process.env.GUEST_PASSWORD   || 'Guest@360!');
seedUser('guest-2',   'guest2@smartresort.demo',  'Jamie Lee',     'guest',   '308', process.env.GUEST_PASSWORD   || 'Guest@360!');
seedUser('manager-1', 'manager@smartresort.demo', 'Priya Sharma',  'manager', '',    process.env.MANAGER_PASSWORD || 'Manager@360!');
seedResortData(db);

// ── Express setup ─────────────────────────────────────────────────────────────
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

// Cache-control + CSRF header check on all /api routes
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(req.method) && req.get('X-SR360') !== 'portal')
    return res.status(403).json({ error: 'Request verification failed.' });
  next();
});

// ── Auth helpers ──────────────────────────────────────────────────────────────
const digest = token => token ? createHash('sha256').update(token).digest('hex') : '';
const tokenOf = req => (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('sr360='))?.slice(6);
const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' };
const publicUser = row => ({ id: row.id, email: row.email, name: row.name, role: row.role, room: row.room });
const textValid = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const attempts = new Map();

// ── Auth routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const key = req.ip;
  const now = Date.now();
  const attempt = attempts.get(key);
  if (attempt && attempt.until > now && attempt.count >= 10)
    return res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
  const { email, password, role } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || password.length > 256 || !['guest', 'manager'].includes(role))
    return res.status(400).json({ error: 'Enter your email, password and portal.' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  const actual = scryptSync(password, user?.salt || 'invalid-user-salt', 64);
  const expected = user ? Buffer.from(user.password, 'hex') : Buffer.alloc(64);
  if (!timingSafeEqual(actual, expected) || !user || user.role !== role) {
    const current = attempt && attempt.until > now ? attempt : { count: 0, until: now + 900000 };
    current.count++; attempts.set(key, current);
    return res.status(401).json({ error: 'The credentials do not match this portal.' });
  }
  attempts.delete(key);
  const oldToken = tokenOf(req);
  if (oldToken) db.prepare('DELETE FROM sessions WHERE token = ?').run(digest(oldToken));
  db.prepare('DELETE FROM sessions WHERE expires < ?').run(now);
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(digest(token), user.id, now + 8 * 3600000);
  res.cookie('sr360', token, { ...cookieOptions, maxAge: 8 * 3600000 }).json(publicUser(user));
});

// Always allow logout regardless of current session expiration state
app.post('/api/auth/logout', (req, res) => {
  const token = tokenOf(req);
  if (token) {
    try {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(digest(token));
    } catch {
      // Ignore if session already deleted
    }
  }
  res.clearCookie('sr360', cookieOptions).json({ ok: true });
});

// ── AI Concierge — open to all (no session required) ─────────────────────────
app.post('/api/concierge/chat', async (req, res) => {
  if (!textValid(req.body.message, 2000))
    return res.status(400).json({ error: 'Ask a question up to 2,000 characters.' });

  // Fetch current live dynamic rates from rates table
  const rateRows = db.prepare('SELECT id, amount FROM rates').all();
  const liveRates = {
    standard: { name: 'Garden Room', amount: rateRows.find(r => r.id === 'standard')?.amount || 6500 },
    suite:    { name: 'Ocean Suite', amount: rateRows.find(r => r.id === 'suite')?.amount || 14500 },
    villa:    { name: 'Private Pool Villa', amount: rateRows.find(r => r.id === 'villa')?.amount || 28000 },
  };

  const result = await ragAnswer(req.body.message.trim(), liveRates);
  const id = randomUUID();
  const now = new Date().toISOString();
  // Resolve user_id from session if available, else anonymous
  const token = tokenOf(req);
  const sessionUser = token && db.prepare('SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ? AND expires > ?').get(digest(token), Date.now());
  const userId = sessionUser ? sessionUser.id : 'anonymous';
  db.prepare('INSERT INTO concierge_logs VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, userId, req.body.message.trim(), result.answer, result.mode, result.model || null, now
  );
  sbInsert('concierge_logs', { id, user_id: userId, question: req.body.message.trim(), answer: result.answer, mode: result.mode, model: result.model, created_at: now });
  res.json(result);
});

// Require session for all subsequent /api routes
app.use('/api', (req, res, next) => {
  const token = tokenOf(req);
  const user = token && db.prepare('SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ? AND expires > ?').get(digest(token), Date.now());
  if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
  req.user = publicUser(user); next();
});

app.get('/api/auth/me', (req, res) => res.json(req.user));

const role = required => (req, res, next) => req.user.role === required ? next() : res.status(403).json({ error: 'You do not have access to this workspace.' });

// ── Menu & requests ───────────────────────────────────────────────────────────
const menu = [
  {
    id: 'podi_dosa',
    name: 'Crispy Podi Ghee Dosa',
    description: 'Golden fermented crepe roasted in spiced gun powder & A2 cow ghee, served with fresh coconut & tomato chutneys with piping hot drumstick sambar',
    price: 480,
    kind: 'South Indian Special',
    symbol: '🥞',
    badge: 'Chef Signature',
    category: 'South Indian',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'italian_pizza',
    name: 'Artisan Italian Margherita Pizza',
    description: 'Wood-fired sourdough crust, San Marzano tomato coulis, fresh hand-pulled buffalo mozzarella, sweet garden basil & cold-pressed EVOO',
    price: 890,
    kind: 'Italian Wood-Fired',
    symbol: '🍕',
    badge: 'House Favorite',
    category: 'Italian',
    image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'truffle_burger',
    name: 'Smoked Portobello & Truffle Burger',
    description: 'Grilled brioche bun, caramelized shallots, sautéed portobello mushrooms, aged English cheddar, black truffle aioli & rosemary fries',
    price: 780,
    kind: 'Gourmet Mains',
    symbol: '🍔',
    badge: 'Popular',
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pasta',
    name: 'Wild Basil Pesto & Burrata Penne',
    description: 'Bronze-die penne tossed in fragrant pine nut basil pesto, roasted heirloom cherry tomatoes, creamy burrata & aged parmigiano',
    price: 850,
    kind: 'Italian Pasta',
    symbol: '🍝',
    badge: 'Vegetarian',
    category: 'Italian',
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'bowl',
    name: 'Harvest Superfood Buddha Bowl',
    description: 'Organic tri-color quinoa, Hass avocado ribbons, spicy roasted chickpeas, charred baby broccoli, edamame & citrus tahini drizzle',
    price: 650,
    kind: 'Healthy & Fresh',
    symbol: '🥗',
    badge: 'Vegan / Healthy',
    category: 'Healthy',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'fish',
    name: 'Coastal Herb-Crusted Grilled Fish',
    description: 'Fresh local sea bass filet grilled with garlic-lemon herb butter, served over saffron wild rice and charred asparagus spears',
    price: 1150,
    kind: 'Catch of the Day',
    symbol: '🐟',
    badge: 'Fresh Catch',
    category: 'Seafood',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'butter_chicken',
    name: 'Old Delhi Style Butter Chicken & Naan',
    description: 'Tandoor-charred chicken simmered in a velvet tomato butter makhani gravy with fenugreek, served with piping hot garlic butter naan',
    price: 950,
    kind: 'Royal North Indian',
    symbol: '🍲',
    badge: 'Must Try',
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'royal_biryani',
    name: 'Royal Awadhi Dum Mutton Biryani',
    description: 'Fragrant aged basmati rice layered with tender marinated meat, saffron milk, caramelized onions, kewra and cooling cucumber raita',
    price: 880,
    kind: 'Royal Specialty',
    symbol: '🍚',
    badge: 'Signature',
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'malabar_prawns',
    name: 'Malabar Coastal Tiger Prawn Curry',
    description: 'Jumbo coastal tiger prawns poached in rich coconut cream, crushed black mustard, curry leaves, raw mango & fluffy appams',
    price: 1190,
    kind: 'Coastal Seafood',
    symbol: '🍤',
    badge: 'Seafood Special',
    category: 'Seafood',
    image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'avocado_toast',
    name: 'Artisan Sourdough Avocado Tartine',
    description: 'Toasted country sourdough smeared with crushed Hass avocado, Danish feta crumbles, toasted hemp seeds, radish curls & microgreens',
    price: 540,
    kind: 'Artisan Breakfast',
    symbol: '🥑',
    badge: 'All-Day',
    category: 'Healthy',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'juice',
    name: 'Cold-Pressed Tropical Gold Elixir',
    description: 'Freshly pressed coastal pineapple, Valencia orange, passion fruit, fresh mint leaves and a crisp zesty touch of young ginger',
    price: 320,
    kind: 'Freshly Pressed',
    symbol: '🍹',
    badge: 'Cold Pressed',
    category: 'Beverages',
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'lava_cake',
    name: 'Warm Molten Dark Chocolate Fondant',
    description: 'Single-origin 70% dark chocolate cake with a molten flowing ganache center, Madagascar vanilla bean gelato & raspberry dust',
    price: 490,
    kind: 'Decadent Dessert',
    symbol: '🍫',
    badge: 'Sweet Finish',
    category: 'Desserts',
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80'
  }
];
app.get('/api/menu', (req, res) => res.json(menu));

app.get('/api/requests', (req, res) => {
  const q = 'SELECT requests.*, users.name AS guest_name, users.room FROM requests JOIN users ON users.id = requests.user_id';
  res.json(
    req.user.role === 'manager'
      ? db.prepare(q + ' ORDER BY created_at DESC').all()
      : db.prepare(q + ' WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id)
  );
});

app.post('/api/requests', role('guest'), (req, res) => {
  let { category, title, detail = '', items } = req.body;
  if (!['Dining', 'Housekeeping', 'Maintenance', 'Spa', 'Special request'].includes(category)
      || !textValid(title, 120) || typeof detail !== 'string' || detail.length > 2000)
    return res.status(400).json({ error: 'Choose a service and describe your request (up to 2,000 characters).' });
  let total = 0;
  if (category === 'Dining') {
    if (!Array.isArray(items) || items.length < 1 || items.length > 20
        || items.some(item => !menu.some(m => m.id === item.id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10))
      return res.status(400).json({ error: 'Choose valid menu items and quantities.' });
    total = items.reduce((sum, item) => sum + menu.find(m => m.id === item.id).price * item.quantity, 0);
    title = 'In-room dining order';
    detail = items.map(item => `${item.quantity} × ${menu.find(m => m.id === item.id).name}`).join(', ') + (detail ? ` · Note: ${detail}` : '');
  }
  const id = randomUUID();
  db.prepare('INSERT INTO requests VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, req.user.id, category, title.trim(), detail.trim(), total, 'New', new Date().toISOString());

  // ── Interconnect with Live Inventory Stock ─────────────────────────────────
  try {
    if (category === 'Dining') {
      db.prepare("UPDATE inventory_items SET stock = MAX(0, stock - 2) WHERE name = 'Fresh Milk'").run();
      db.prepare("UPDATE inventory_items SET stock = MAX(0, stock - 1.5) WHERE name = 'Chicken Breast'").run();
      db.prepare("UPDATE inventory_items SET stock = MAX(0, stock - 2) WHERE name = 'Rice Basmati'").run();
      db.prepare("UPDATE inventory_items SET stock = MAX(0, stock - 1) WHERE name = 'Fresh Vegetables'").run();
      db.prepare("UPDATE inventory_items SET status = CASE WHEN stock <= min_stock * 0.5 THEN 'Critical' WHEN stock <= min_stock THEN 'Low' ELSE 'Optimal' END WHERE category IN ('Dairy', 'Meat', 'Grains', 'Produce')").run();
    } else if (category === 'Housekeeping') {
      db.prepare("UPDATE inventory_items SET stock = MAX(0, stock - 2) WHERE name = 'Toilet Paper'").run();
      db.prepare("UPDATE inventory_items SET stock = MAX(0, stock - 1) WHERE name = 'Shampoo Bottles'").run();
      db.prepare("UPDATE inventory_items SET status = CASE WHEN stock <= min_stock * 0.5 THEN 'Critical' WHEN stock <= min_stock THEN 'Low' ELSE 'Optimal' END WHERE category IN ('Housekeeping', 'Amenities')").run();
    } else if (category === 'Maintenance') {
      db.prepare("UPDATE inventory_items SET stock = MAX(0, stock - 0.5) WHERE name = 'Pool Chemicals'").run();
      db.prepare("UPDATE inventory_items SET status = CASE WHEN stock <= min_stock * 0.5 THEN 'Critical' WHEN stock <= min_stock THEN 'Low' ELSE 'Optimal' END WHERE category = 'Maintenance'").run();
    }
  } catch (err) {
    console.error('[Inventory Sync Error]', err.message);
  }

  res.status(201).json({ id });
});

app.patch('/api/requests/:id', role('manager'), (req, res) => {
  if (!['New', 'In progress', 'Completed'].includes(req.body.status))
    return res.status(400).json({ error: 'Invalid request status.' });
  const result = db.prepare('UPDATE requests SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.status(result.changes ? 200 : 404).json(result.changes ? { ok: true } : { error: 'Request not found.' });
});

// ── Feedback + AI sentiment ───────────────────────────────────────────────────
app.post('/api/feedback', role('guest'), async (req, res) => {
  const { rating, comment } = req.body;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !textValid(comment, 3000))
    return res.status(400).json({ error: 'Please add a rating from 1 to 5 and feedback up to 3,000 characters.' });
  const analysis = await analyzeFeedback(comment.trim(), rating);
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO feedback VALUES (?, ?, ?, ?, ?, ?)').run(id, req.user.id, rating, comment.trim(), JSON.stringify(analysis), now);
  // Mirror to Supabase for real-time dashboard queries
  sbInsert('feedback', { id, user_id: req.user.id, rating, comment: comment.trim(), analysis, created_at: now });
  res.status(201).json({ id, analysis });
});

app.get('/api/feedback', async (req, res) => {
  const q = 'SELECT feedback.*, users.name AS guest_name, users.room FROM feedback JOIN users ON users.id = feedback.user_id';
  const rows = req.user.role === 'manager'
    ? db.prepare(q + ' ORDER BY created_at DESC').all()
    : db.prepare(q + ' WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(rows.map(row => ({ ...row, analysis: JSON.parse(row.analysis) })));
});

// ── Dynamic pricing ───────────────────────────────────────────────────────────
app.get('/api/pricing', role('manager'), (req, res) => res.json(db.prepare('SELECT * FROM rates').all()));

app.post('/api/pricing/scenario', role('manager'), async (req, res) => {
  const { occupancy, season, dow, lead_days, competitor_avg, local_events, review_score } = req.body;
  if (!Number.isFinite(occupancy) || occupancy < 0 || occupancy > 100
      || !Number.isFinite(season) || season < 0.5 || season > 1.5)
    return res.status(400).json({ error: 'Invalid occupancy or season factor.' });

  const result = await pricingScenario({
    occupancy, season,
    dow: Number.isFinite(dow) ? dow : new Date().getDay(),
    lead_days: Number.isFinite(lead_days) ? lead_days : 14,
    competitor_avg: Number.isFinite(competitor_avg) ? competitor_avg : 15000,
    local_events: local_events ? 1 : 0,
    review_score: Number.isFinite(review_score) ? review_score : 4.2,
  });

  const logId = randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO pricing_logs VALUES (?, ?, ?, ?, ?)').run(logId, req.user.id, JSON.stringify(result.inputs), JSON.stringify(result), now);
  sbInsert('pricing_logs', { id: logId, user_id: req.user.id, inputs: result.inputs, result, created_at: now });

  res.json(result);
});

app.post('/api/pricing/apply', role('manager'), async (req, res) => {
  const { id, occupancy, season } = req.body;
  if (!Number.isFinite(occupancy) || occupancy < 0 || occupancy > 100
      || !Number.isFinite(season) || season < 0.5 || season > 1.5)
    return res.status(400).json({ error: 'Invalid scenario.' });
  const result = await pricingScenario({ occupancy, season });
  const room = result.rooms.find(r => r.id === id);
  if (!room) return res.status(400).json({ error: 'Invalid room.' });

  // Save to rates table
  db.prepare('INSERT OR REPLACE INTO rates VALUES (?, ?, ?, ?)').run(id, room.recommended, new Date().toISOString(), req.user.id);

  // Sync live rate to rooms table in SQLite
  const typeMap = {
    standard: 'Garden Room',
    suite: 'Ocean Suite',
    villa: 'Private Pool Villa'
  };
  const typeName = typeMap[id] || room.name;
  db.prepare('UPDATE rooms SET price_per_night = ? WHERE type = ?').run(room.recommended, typeName);

  res.json({ ok: true, rate: room.recommended, type: typeName });
});

// Sentiment stats endpoint (manager only — strictly 3 categories: positive, neutral, negative)
app.get('/api/sentiment/stats', role('manager'), (req, res) => {
  const rows = db.prepare('SELECT analysis FROM feedback ORDER BY created_at DESC LIMIT 200').all();
  const analyses = rows.map(r => { try { return JSON.parse(r.analysis); } catch { return null; } }).filter(Boolean);
  const counts = { positive: 0, neutral: 0, negative: 0 };
  const aspects = {};
  for (const a of analyses) {
    const s = a.sentiment === 'positive' ? 'positive' : a.sentiment === 'negative' ? 'negative' : 'neutral';
    counts[s] = (counts[s] || 0) + 1;
    for (const asp of (a.aspects || [])) aspects[asp] = (aspects[asp] || 0) + 1;
  }
  const total = analyses.length || 1;
  res.json({
    total: analyses.length,
    counts,
    distribution: Object.entries(counts).map(([name, count]) => ({ name, count, pct: Math.round(count / total * 100) })),
    topAspects: Object.entries(aspects).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })),
    avgUrgency: analyses.filter(a => a.urgency === 'high').length,
    method: analyses[0]?.method || 'nlp-text-analyzer',
  });
});

// ── Guest Experience Dynamic & Synced Endpoint (Manager only) ────────────────
let guestOffers = [
  { id: 'off-1', room: '204', guest: 'Alex Morgan', offer: 'Complimentary Sunset Champagne & Truffles', reason: 'Anniversary celebration detected • VIP Platinum', expires: 'Today', status: 'Pending' },
  { id: 'off-2', room: '308', guest: 'Jamie Lee', offer: 'Complimentary 30-min Spa Hydrotherapy Extension', reason: 'Wellness spa preference detected • VIP Gold', expires: 'Tomorrow', status: 'Accepted' },
  { id: 'off-3', room: '205', guest: 'David Chen Family', offer: 'Kids Beach Adventure Safari (50% off)', reason: 'Family with 2 children preference', expires: '28 Sept', status: 'Pending' },
  { id: 'off-4', room: '102', guest: 'Sarah Jenkins', offer: "Chef's Table Wine Pairing Tasting Experience", reason: 'Fine dining culinary preference', expires: '30 Sept', status: 'Redeemed' },
];

app.get('/api/guest-experience/overview', role('manager'), (req, res) => {
  const roomStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) as occupied,
      SUM(CASE WHEN status = 'Occupied' THEN guest_count ELSE 0 END) as total_guests
    FROM rooms
  `).get();

  const totalRooms = roomStats.total || 150;
  const occupiedRooms = roomStats.occupied || 129;
  const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100);

  const feedbackRows = db.prepare('SELECT * FROM feedback ORDER BY created_at DESC').all();
  const feedbackCount = feedbackRows.length;
  const avgRating = feedbackCount > 0
    ? (feedbackRows.reduce((sum, f) => sum + f.rating, 0) / feedbackCount).toFixed(1)
    : '4.8';

  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const f of feedbackRows) {
    try {
      const a = JSON.parse(f.analysis);
      const s = a.sentiment === 'positive' ? 'positive' : a.sentiment === 'negative' ? 'negative' : 'neutral';
      counts[s]++;
    } catch {}
  }

  const categoryAspects = {
    'Room Quality': ['housekeeping', 'cleaning', 'toilet', 'room quality', 'bed'],
    'Service': ['service', 'staff', 'concierge'],
    'F&B': ['dining', 'food', 'restaurant', 'breakfast'],
    'Amenities': ['facilities', 'pool', 'spa', 'wifi'],
    'Value': ['value', 'price']
  };

  const satisfactionByCategory = Object.entries(categoryAspects).map(([cat, keywords]) => {
    const matching = feedbackRows.filter(f => {
      const lower = (f.comment || '').toLowerCase();
      try {
        const a = JSON.parse(f.analysis);
        const asp = (a.aspects || []).join(' ').toLowerCase();
        return keywords.some(k => lower.includes(k) || asp.includes(k));
      } catch {
        return keywords.some(k => lower.includes(k));
      }
    });

    let score = 90;
    if (matching.length > 0) {
      const catAvg = matching.reduce((sum, m) => sum + m.rating, 0) / matching.length;
      score = Math.round((catAvg / 5) * 100);
    } else {
      score = cat === 'Room Quality' ? 92 : cat === 'Service' ? 88 : cat === 'F&B' ? 85 : cat === 'Amenities' ? 90 : 86;
    }
    return { category: cat, score };
  });

  const occupiedList = db.prepare(`
    SELECT * FROM rooms WHERE status = 'Occupied' ORDER BY CAST(room_number AS INTEGER) ASC LIMIT 24
  `).all();

  const profiles = occupiedList.map(r => {
    const reqCount = db.prepare('SELECT COUNT(*) as count FROM requests JOIN users ON users.id = requests.user_id WHERE users.room = ?').get(r.room_number)?.count || 0;
    const guestFb = feedbackRows.filter(f => f.room === r.room_number);
    let sentiment = 'positive';
    let score = 92;
    if (guestFb.length > 0) {
      try {
        const a = JSON.parse(guestFb[0].analysis);
        sentiment = a.sentiment || 'positive';
        score = sentiment === 'positive' ? 96 : sentiment === 'neutral' ? 82 : 68;
      } catch {}
    } else {
      score = r.vip_tier === 'Platinum' ? 96 : r.vip_tier === 'Gold' ? 91 : 87;
      sentiment = 'positive';
    }

    const prefs = [];
    if (r.special_requests) {
      const sr = r.special_requests.toLowerCase();
      if (sr.includes('anniversary') || sr.includes('celebrating')) prefs.push('Anniversary');
      if (sr.includes('pillow') || sr.includes('towel') || sr.includes('linens')) prefs.push('Luxury Linens');
      if (sr.includes('late check-out')) prefs.push('Late Checkout');
      if (sr.includes('quiet')) prefs.push('Quiet Suite');
      if (sr.includes('crib') || sr.includes('family')) prefs.push('Family Care');
      if (sr.includes('dining') || sr.includes('fruit') || sr.includes('espresso')) prefs.push('Gourmet Dining');
    }
    if (prefs.length === 0) prefs.push('Spa & Wellness', 'Ocean View');

    return {
      id: r.room_number,
      name: r.guest_name,
      room: r.room_number,
      type: r.type,
      floor: r.floor,
      stay: r.check_in && r.check_out ? `${new Date(r.check_in).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${new Date(r.check_out).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : '24 Sept - 29 Sept',
      preferences: prefs,
      sentiment,
      score,
      requests: reqCount,
      avatar: (r.guest_name || 'Guest').split(' ').map(x => x[0]).join(''),
      vip: r.vip_tier === 'Platinum' || r.vip_tier === 'Gold',
      vip_tier: r.vip_tier,
      age: r.guest_age,
      gender: r.guest_gender,
      email: r.guest_email,
      phone: r.guest_phone,
      special_requests: r.special_requests,
      notes: r.notes
    };
  });

  const preferenceTrends = [
    { name: 'Spa & Wellness', guests: 48, trend: '+14%' },
    { name: 'Adventure & Water Sports', guests: 34, trend: '+9%' },
    { name: 'Fine Dining & Sunset Bar', guests: 72, trend: '+18%' },
    { name: 'Kids Club & Family Activities', guests: 29, trend: '+11%' },
    { name: 'Executive & Quiet Lounges', guests: 22, trend: '+3%' },
  ];

  res.json({
    occupancy: {
      totalRooms,
      occupiedRooms,
      occupancyRate,
      activeGuestsCount: occupiedRooms
    },
    guestSatisfaction: `${avgRating}/5`,
    guestSatisfactionScore: Number(avgRating),
    totalFeedback: feedbackCount,
    sentimentBreakdown: counts,
    satisfactionByCategory,
    preferenceTrends,
    guestProfiles: profiles,
    personalizedOffers: guestOffers,
    offersRedeemedCount: guestOffers.filter(o => o.status === 'Accepted' || o.status === 'Redeemed').length
  });
});

app.post('/api/guest-experience/offers/:id/action', role('manager'), (req, res) => {
  const { action } = req.body;
  const offer = guestOffers.find(o => o.id === req.params.id);
  if (!offer) return res.status(404).json({ error: 'Offer not found.' });

  if (action === 'redeem') offer.status = 'Redeemed';
  else if (action === 'send') offer.status = 'Accepted';
  else offer.status = 'Accepted';

  res.json({ ok: true, offer });
});

// ── Rooms & Guests (Manager only) ──────────────────────────────────────────
app.get('/api/rooms', role('manager'), (req, res) => {
  const { status, floor, search } = req.query;
  let query = 'SELECT * FROM rooms WHERE 1=1';
  const params = [];
  if (status && status !== 'All') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (floor && floor !== 'All') {
    query += ' AND floor = ?';
    params.push(Number(floor));
  }
  if (search && search.trim()) {
    query += ' AND (room_number LIKE ? OR guest_name LIKE ? OR type LIKE ?)';
    const s = `%${search.trim()}%`;
    params.push(s, s, s);
  }
  query += ' ORDER BY CAST(room_number AS INTEGER) ASC';
  const rooms = db.prepare(query).all(...params);

  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) as occupied,
      SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available,
      SUM(CASE WHEN status = 'Cleaning' THEN 1 ELSE 0 END) as cleaning,
      SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END) as maintenance
    FROM rooms
  `).get();

  const total = stats.total || 150;
  const occupied = stats.occupied || 129;
  const occupancyRate = Math.round((occupied / total) * 100);

  res.json({
    stats: {
      total,
      occupied,
      available: stats.available || 0,
      cleaning: stats.cleaning || 0,
      maintenance: stats.maintenance || 0,
      occupancyRate
    },
    rooms
  });
});

app.get('/api/rooms/:room_number', role('manager'), (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE room_number = ?').get(req.params.room_number);
  if (!room) return res.status(404).json({ error: 'Room not found.' });

  const requests = db.prepare(`
    SELECT requests.*, users.name as guest_name 
    FROM requests 
    JOIN users ON users.id = requests.user_id 
    WHERE users.room = ? 
    ORDER BY requests.created_at DESC
  `).all(req.params.room_number);

  res.json({ room, requests });
});

app.patch('/api/rooms/:room_number', role('manager'), (req, res) => {
  const { status, notes, special_requests } = req.body;
  const room = db.prepare('SELECT * FROM rooms WHERE room_number = ?').get(req.params.room_number);
  if (!room) return res.status(404).json({ error: 'Room not found.' });

  const newStatus = status || room.status;
  const newNotes = notes !== undefined ? notes : room.notes;
  const newReq = special_requests !== undefined ? special_requests : room.special_requests;

  db.prepare('UPDATE rooms SET status = ?, notes = ?, special_requests = ? WHERE room_number = ?')
    .run(newStatus, newNotes, newReq, req.params.room_number);

  res.json({ ok: true, room: db.prepare('SELECT * FROM rooms WHERE room_number = ?').get(req.params.room_number) });
});

// ── Dynamic Analytics for Overview ──────────────────────────────────────────
app.get('/api/analytics/occupancy', role('manager'), (req, res) => {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) as occupied,
      SUM(CASE WHEN status = 'Occupied' THEN price_per_night ELSE 0 END) as room_revenue
    FROM rooms
  `).get();

  const total = stats.total || 150;
  const occupied = stats.occupied || 129;
  const currentPct = Math.round((occupied / total) * 100);

  // Dynamic 7-day occupancy curve calibrated around current active occupancy
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const basePercentages = [65, 72, 69, 81, 86, 94, 87];
  const delta = currentPct - 86;

  const trend = days.map((day, i) => {
    const rawPct = Math.min(100, Math.max(30, basePercentages[i] + delta));
    const estOccupied = Math.round((rawPct / 100) * total);
    const dayRevenue = Number(((estOccupied * 18500) / 100000).toFixed(1));
    return {
      day,
      occupancy: rawPct,
      occupiedRooms: estOccupied,
      revenueLakhs: dayRevenue
    };
  });

  const dailyRoomRevenue = stats.room_revenue || (occupied * 18500);
  const diningTotal = db.prepare("SELECT COALESCE(SUM(total), 0) as sum FROM requests WHERE category = 'Dining'").get()?.sum || 0;
  const totalDailyRevenue = dailyRoomRevenue + diningTotal;
  const revenueLakhsStr = `Rs.${(totalDailyRevenue / 100000).toFixed(1)}L`;

  res.json({
    occupancyRate: currentPct,
    occupiedCount: occupied,
    totalRooms: total,
    dailyRevenue: revenueLakhsStr,
    dailyRevenueRaw: totalDailyRevenue,
    trend
  });
});

// ── Predictive Maintenance (Manager only) ───────────────────────────────────
app.get('/api/maintenance/overview', role('manager'), (req, res) => {
  const equipment = db.prepare('SELECT * FROM maintenance_equipment ORDER BY failure_probability DESC').all();
  const tasks = db.prepare('SELECT * FROM maintenance_tasks ORDER BY created_at DESC').all();

  const healthCounts = { Healthy: 0, Warning: 0, Critical: 0 };
  for (const eq of equipment) {
    if (eq.status === 'Critical') healthCounts.Critical++;
    else if (eq.status === 'Warning') healthCounts.Warning++;
    else healthCounts.Healthy++;
  }

  const total = equipment.length || 1;
  const healthDistribution = [
    { name: 'Healthy', value: Math.round((healthCounts.Healthy / total) * 100), count: healthCounts.Healthy, color: '#10b981' },
    { name: 'Warning', value: Math.round((healthCounts.Warning / total) * 100), count: healthCounts.Warning, color: '#f59e0b' },
    { name: 'Critical', value: Math.round((healthCounts.Critical / total) * 100), count: healthCounts.Critical, color: '#ef4444' },
  ];

  const maintenanceHistory = [
    { month: 'Aug', scheduled: 12, emergency: 3, cost: 2.4 },
    { month: 'Sep', scheduled: 15, emergency: 2, cost: 1.8 },
    { month: 'Oct', scheduled: 10, emergency: 5, cost: 3.2 },
    { month: 'Nov', scheduled: 14, emergency: 1, cost: 1.5 },
    { month: 'Dec', scheduled: 11, emergency: 4, cost: 2.8 },
    { month: 'Jan', scheduled: 16, emergency: 2, cost: 1.9 },
  ];

  // Dynamic live sensor readings for Main Pool Pump based on current equipment health
  const poolPump = equipment.find(e => e.id === 'eq-1') || {};
  const isPumpCritical = poolPump.status === 'Critical';
  const curVibration = isPumpCritical ? 4.8 : 2.4;
  const curTemp = isPumpCritical ? 68 : 49;
  const curPressure = isPumpCritical ? 24 : 18;

  const sensorReadings = [
    { time: '00:00', vibration: 2.1, temperature: 45, pressure: 12 },
    { time: '04:00', vibration: 2.3, temperature: 47, pressure: 13 },
    { time: '08:00', vibration: 2.8, temperature: 52, pressure: 15 },
    { time: '12:00', vibration: 3.5, temperature: 58, pressure: 18 },
    { time: '16:00', vibration: 4.2, temperature: 65, pressure: 22 },
    { time: '20:00', vibration: curVibration, temperature: curTemp, pressure: curPressure },
  ];

  res.json({
    equipment,
    tasks,
    healthDistribution,
    maintenanceHistory,
    sensorReadings,
    criticalCount: healthCounts.Critical,
    scheduledCount: tasks.filter(t => t.status === 'Scheduled').length,
    overallHealthPct: Math.round(equipment.reduce((acc, eq) => acc + eq.health, 0) / (equipment.length || 1)),
  });
});

app.post('/api/maintenance/schedule', role('manager'), (req, res) => {
  const { equipmentId, task, priority = 'Critical', technician, scheduledDate, duration = '3 hours', estimatedCost, notes = '' } = req.body;
  if (!equipmentId || !task) return res.status(400).json({ error: 'Equipment and task description are required.' });

  const eq = db.prepare('SELECT * FROM maintenance_equipment WHERE id = ?').get(equipmentId);
  if (!eq) return res.status(404).json({ error: 'Equipment not found.' });

  const taskId = 'task-' + randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  // Create scheduled work order task
  db.prepare(`
    INSERT INTO maintenance_tasks (
      id, equipment_id, equipment_name, task, priority, technician, scheduled_date, duration, status, estimated_cost, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    taskId, eq.id, eq.name, task, priority, technician || 'Emergency Engineering Team',
    scheduledDate || 'Tomorrow 9:00 AM', duration, 'Scheduled', estimatedCost || eq.estimated_cost || '₹50K', notes, now
  );

  // Update equipment status: improve health, decrease failure probability, set status to Repair Scheduled
  const newHealth = Math.min(88, eq.health + 30);
  const newFailureProb = Math.max(12, eq.failure_probability - 45);
  const newStatus = 'Repair Scheduled';

  db.prepare('UPDATE maintenance_equipment SET status = ?, health = ?, failure_probability = ?, next_due = ? WHERE id = ?')
    .run(newStatus, newHealth, newFailureProb, scheduledDate || 'Scheduled', eq.id);

  res.status(201).json({
    ok: true,
    taskId,
    message: `Repair successfully scheduled for ${eq.name}. Work order #${taskId} created.`,
    updatedEquipment: db.prepare('SELECT * FROM maintenance_equipment WHERE id = ?').get(eq.id)
  });
});

app.post('/api/maintenance/equipment', role('manager'), (req, res) => {
  const { name, location, type, status = 'Healthy', health = 90, failureProbability = 10, estimatedCost = null } = req.body;
  if (!textValid(name, 100)) return res.status(400).json({ error: 'Equipment name is required.' });

  const id = 'eq-' + randomUUID().slice(0, 8);
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT INTO maintenance_equipment (
      id, name, location, type, status, health, last_maintenance, next_due, failure_probability, issue, estimated_cost
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name.trim(), location || 'Resort Grounds', type || 'General', status, health, today, today, failureProbability, null, estimatedCost);

  res.status(201).json({ ok: true, id });
});

app.patch('/api/maintenance/tasks/:id', role('manager'), (req, res) => {
  const { status, scheduled_date } = req.body;
  const task = db.prepare('SELECT * FROM maintenance_tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  db.prepare('UPDATE maintenance_tasks SET status = COALESCE(?, status), scheduled_date = COALESCE(?, scheduled_date) WHERE id = ?')
    .run(status || null, scheduled_date || null, req.params.id);

  res.json({ ok: true, task: db.prepare('SELECT * FROM maintenance_tasks WHERE id = ?').get(req.params.id) });
});

// ── Staff Scheduling API ──────────────────────────────────────────────────────
app.get('/api/staff', role('manager'), (req, res) => {
  const staff = db.prepare('SELECT * FROM staff_members ORDER BY id ASC').all();
  const recs = db.prepare('SELECT * FROM staff_recommendations WHERE status = "active"').all();

  const totalStaff = staff.length || 54;
  const onShift = staff.filter(s => s.status === 'On Shift').length;
  const avgEfficiency = staff.length ? Math.round(staff.reduce((acc, s) => acc + s.efficiency, 0) / staff.length) : 91;
  const hoursToday = staff.reduce((acc, s) => acc + s.hours, 0) || 298;

  // Real occupancy and requests link to dynamic department workloads
  const occupiedCount = db.prepare("SELECT COUNT(*) as c FROM rooms WHERE status = 'Occupied'").get().c;
  const pendingRequests = db.prepare("SELECT category, COUNT(*) as c FROM requests WHERE status != 'Completed' GROUP BY category").all();
  const reqMap = Object.fromEntries(pendingRequests.map(r => [r.category, r.c]));

  const housekeepingLoad = Math.min(99, Math.round(76 + (occupiedCount / 150) * 18 + (reqMap['Housekeeping'] || 0) * 2));
  const frontOfficeLoad = Math.min(95, Math.round(62 + (occupiedCount / 150) * 12));
  const fbLoad = Math.min(95, Math.round(68 + (occupiedCount / 150) * 16 + (reqMap['Dining'] || 0) * 3));
  const engLoad = Math.min(90, Math.round(58 + (reqMap['Maintenance'] || 0) * 5));

  const workloadData = [
    { department: 'Housekeeping', current: housekeepingLoad, optimal: 80, staff: staff.filter(s => s.department === 'Housekeeping').length || 12 },
    { department: 'Front Office', current: frontOfficeLoad, optimal: 75, staff: staff.filter(s => s.department === 'Front Office').length || 6 },
    { department: 'F&B', current: fbLoad, optimal: 80, staff: staff.filter(s => s.department === 'F&B').length || 18 },
    { department: 'Engineering', current: engLoad, optimal: 70, staff: staff.filter(s => s.department === 'Engineering').length || 8 },
    { department: 'Spa', current: 45, optimal: 60, staff: staff.filter(s => s.department.includes('Spa')).length || 4 },
    { department: 'Security', current: 88, optimal: 85, staff: staff.filter(s => s.department === 'Security').length || 6 },
  ];

  const efficiencyTrend = [
    { day: 'Mon', efficiency: 85 },
    { day: 'Tue', efficiency: 88 },
    { day: 'Wed', efficiency: 82 },
    { day: 'Thu', efficiency: 90 },
    { day: 'Fri', efficiency: 87 },
    { day: 'Sat', efficiency: 91 },
    { day: 'Sun', efficiency: 89 },
  ];

  const shiftSchedule = [
    { time: '06:00', label: 'Early Morning', staff: staff.filter(s => s.shift === 'Morning' && s.hours >= 8).length || 8, color: 'bg-orange-100 text-orange-700' },
    { time: '09:00', label: 'Morning Peak', staff: onShift || 24, color: 'bg-blue-100 text-blue-700' },
    { time: '14:00', label: 'Afternoon', staff: staff.filter(s => s.shift === 'Morning' || s.shift === 'Afternoon').length || 18, color: 'bg-green-100 text-green-700' },
    { time: '18:00', label: 'Evening', staff: staff.filter(s => s.shift === 'Evening').length || 22, color: 'bg-purple-100 text-purple-700' },
    { time: '22:00', label: 'Night', staff: staff.filter(s => s.shift === 'Night').length || 6, color: 'bg-slate-100 text-slate-700' },
  ];

  res.json({
    metrics: {
      totalStaff,
      onShift,
      avgEfficiency,
      hoursToday,
      activeWorkforcePct: Math.round((onShift / (totalStaff || 1)) * 100)
    },
    recommendations: recs,
    workloadData,
    efficiencyTrend,
    shiftSchedule,
    staffMembers: staff
  });
});

app.post('/api/staff', role('manager'), (req, res) => {
  const { name, role: staffRole, department, shift = 'Morning', hours = 8, phone = '', email = '', assigned_area = '' } = req.body;
  if (!textValid(name, 100) || !textValid(staffRole, 100))
    return res.status(400).json({ error: 'Name and role are required.' });

  const avatar = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const efficiency = 88 + Math.floor(Math.random() * 10);
  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO staff_members (
      name, role, department, status, shift, hours, efficiency, avatar, phone, email, experience_years, assigned_area, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(), staffRole.trim(), department || 'Front Office', 'On Shift', shift,
    Number(hours) || 8, efficiency, avatar, phone, email, 3, assigned_area || 'Resort Premises', now
  );

  const created = db.prepare('SELECT * FROM staff_members WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ok: true, staff: created });
});

app.put('/api/staff/:id', role('manager'), (req, res) => {
  const { status, shift, hours, department } = req.body;
  const staff = db.prepare('SELECT * FROM staff_members WHERE id = ?').get(req.params.id);
  if (!staff) return res.status(404).json({ error: 'Staff member not found.' });

  db.prepare(`
    UPDATE staff_members
    SET status = COALESCE(?, status),
        shift = COALESCE(?, shift),
        hours = COALESCE(?, hours),
        department = COALESCE(?, department)
    WHERE id = ?
  `).run(status || null, shift || null, hours ? Number(hours) : null, department || null, req.params.id);

  res.json({ ok: true, staff: db.prepare('SELECT * FROM staff_members WHERE id = ?').get(req.params.id) });
});

app.post('/api/staff/recommendations/:id/action', role('manager'), (req, res) => {
  const { id } = req.params;
  const rec = db.prepare('SELECT * FROM staff_recommendations WHERE id = ?').get(id);
  if (!rec) return res.status(404).json({ error: 'Recommendation not found.' });

  if (rec.action.includes('Redeploy')) {
    db.prepare("UPDATE staff_members SET department = 'Housekeeping', role = 'Cross-Support Room Turnover' WHERE department = 'Spa & Wellness'").run();
    db.prepare("UPDATE staff_recommendations SET status = 'completed' WHERE id = ?").run(id);
    return res.json({ ok: true, message: '2 Spa staff members redeployed to Housekeeping. Turnover efficiency improved by 35%!' });
  }

  if (rec.action.includes('Overtime')) {
    db.prepare("UPDATE staff_members SET hours = hours + 2 WHERE department = 'Security'").run();
    db.prepare("UPDATE staff_recommendations SET status = 'completed' WHERE id = ?").run(id);
    return res.json({ ok: true, message: 'Night shift coverage gap resolved. 2 overtime hours scheduled for security team.' });
  }

  if (rec.action.includes('Training')) {
    db.prepare("UPDATE staff_members SET role = role || ' (Pool Certified)' WHERE department = 'F&B'").run();
    db.prepare("UPDATE staff_recommendations SET status = 'completed' WHERE id = ?").run(id);
    return res.json({ ok: true, message: 'Cross-training module initiated for F&B staff in pool safety operations.' });
  }

  db.prepare("UPDATE staff_recommendations SET status = 'completed' WHERE id = ?").run(id);
  res.json({ ok: true, message: 'Action executed successfully.' });
});

// ── Inventory Optimization API ────────────────────────────────────────────────
app.get('/api/inventory', role('manager'), (req, res) => {
  const items = db.prepare('SELECT * FROM inventory_items ORDER BY id ASC').all();
  const purchaseOrders = db.prepare('SELECT * FROM purchase_orders ORDER BY created_at DESC').all();
  const insights = db.prepare('SELECT * FROM inventory_insights WHERE status = "active"').all();

  const lowStockCount = items.filter(i => i.status === 'Low' || i.status === 'Critical').length;
  const pendingOrders = purchaseOrders.filter(po => po.status === 'Pending');
  const pendingOrdersCount = pendingOrders.length;
  const pendingOrdersSum = pendingOrders.reduce((sum, po) => sum + (po.numeric_amount || 0), 0);
  const pendingOrdersValue = `₹${pendingOrdersSum.toLocaleString('en-IN')}`;

  const demandForecast = [
    { day: 'Mon', predicted: 85, actual: 82 },
    { day: 'Tue', predicted: 90, actual: 88 },
    { day: 'Wed', predicted: 75, actual: 78 },
    { day: 'Thu', predicted: 95, actual: 92 },
    { day: 'Fri', predicted: 110, actual: 108 },
    { day: 'Sat', predicted: 125, actual: 130 },
    { day: 'Sun', predicted: 115, actual: 112 },
  ];

  const categoryBreakdown = [
    { name: 'F&B', value: 45, color: '#3b82f6' },
    { name: 'Housekeeping', value: 25, color: '#8b5cf6' },
    { name: 'Amenities', value: 15, color: '#10b981' },
    { name: 'Maintenance', value: 15, color: '#f59e0b' },
  ];

  res.json({
    metrics: {
      totalItems: 1247,
      lowStockCount,
      pendingOrdersCount,
      pendingOrdersValue,
      forecastAccuracy: 94
    },
    insights,
    demandForecast,
    categoryBreakdown,
    items,
    purchaseOrders
  });
});

app.post('/api/inventory/items/:id/order', role('manager'), (req, res) => {
  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found.' });

  const orderUnits = req.body.units || Math.max(20, Math.round(item.max_stock - item.stock));
  const numericCost = Math.round(orderUnits * item.cost);
  const poId = `PO-2026-${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO purchase_orders (id, supplier, items_count, total_amount, numeric_amount, status, expected_date, created_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    poId, item.supplier || 'Primary Supplier', orderUnits,
    `₹${numericCost.toLocaleString('en-IN')}`, numericCost, 'Pending',
    'Tomorrow', now, `Replenishment order for ${item.name} (${orderUnits} ${item.unit})`
  );

  db.prepare("UPDATE inventory_items SET trend = 'up' WHERE id = ?").run(item.id);

  res.status(201).json({
    ok: true,
    poId,
    message: `Purchase Order ${poId} dispatched to ${item.supplier || 'supplier'} for ${orderUnits} ${item.unit} of ${item.name}.`,
    updatedItem: db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(item.id)
  });
});

app.post('/api/inventory/insights/:id/action', role('manager'), (req, res) => {
  const insight = db.prepare('SELECT * FROM inventory_insights WHERE id = ?').get(req.params.id);
  if (!insight) return res.status(404).json({ error: 'Insight not found.' });

  const now = new Date().toISOString();
  let poId = `PO-2026-AI-${Math.floor(100 + Math.random() * 900)}`;
  let message = '';

  if (insight.action_type === 'order_milk') {
    db.prepare(`
      INSERT INTO purchase_orders (id, supplier, items_count, total_amount, numeric_amount, status, expected_date, created_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(poId, 'Heritage Dairy Farms', 60, '₹3,120', 3120, 'Approved', 'Tomorrow 6:00 AM', now, 'Emergency breakfast dairy replenishment');
    db.prepare("UPDATE inventory_items SET stock = stock + 60, status = 'Optimal', trend = 'up' WHERE name = 'Fresh Milk'").run();
    message = 'Emergency Milk order (60 Liters) placed and approved. Delivered by 6:00 AM tomorrow.';
  } else if (insight.action_type === 'increase_chicken') {
    db.prepare(`
      INSERT INTO purchase_orders (id, supplier, items_count, total_amount, numeric_amount, status, expected_date, created_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(poId, 'Meat Masters Wholesalers', 15, '₹4,200', 4200, 'Approved', 'Friday 8:00 AM', now, 'Weekend buffet booking poultry spike allocation');
    db.prepare("UPDATE inventory_items SET stock = stock + 15, status = 'Optimal', trend = 'up' WHERE name = 'Chicken Breast'").run();
    message = 'Chicken order increased by 15kg for Friday delivery. Buffet capacity secured.';
  } else if (insight.action_type === 'bulk_rice') {
    db.prepare(`
      INSERT INTO purchase_orders (id, supplier, items_count, total_amount, numeric_amount, status, expected_date, created_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(poId, 'Royal Grains Exporters', 500, '₹37,400', 37400, 'Approved', 'End of Month', now, 'Bulk order for 500kg Basmati Rice with 12% supplier discount');
    db.prepare("UPDATE inventory_items SET stock = stock + 100, trend = 'up' WHERE name = 'Rice Basmati'").run();
    message = 'Bulk purchase authorized for 500kg Basmati Rice at 12% discount. Saving ₹4,200 monthly.';
  } else {
    message = 'Optimization recommendation executed.';
  }

  db.prepare("UPDATE inventory_insights SET status = 'completed' WHERE id = ?").run(insight.id);

  res.json({ ok: true, poId, message });
});

app.post('/api/inventory/purchase-orders', role('manager'), (req, res) => {
  const { supplier, itemsCount = 1, amount = 10000, notes = '' } = req.body;
  if (!textValid(supplier, 100)) return res.status(400).json({ error: 'Supplier is required.' });

  const poId = `PO-2026-${Math.floor(200 + Math.random() * 800)}`;
  const numericAmount = Number(amount) || 10000;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO purchase_orders (id, supplier, items_count, total_amount, numeric_amount, status, expected_date, created_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    poId, supplier.trim(), Number(itemsCount) || 1,
    `₹${numericAmount.toLocaleString('en-IN')}`, numericAmount,
    'Pending', 'In 2 days', now, notes || 'Standard procurement order'
  );

  res.status(201).json({
    ok: true,
    poId,
    order: db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(poId)
  });
});

app.patch('/api/inventory/purchase-orders/:id/status', role('manager'), (req, res) => {
  const { status } = req.body;
  if (!['Pending', 'Approved', 'Shipped', 'Received'].includes(status))
    return res.status(400).json({ error: 'Invalid status.' });

  const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  db.prepare('UPDATE purchase_orders SET status = ? WHERE id = ?').run(status, req.params.id);

  if (status === 'Received') {
    if (order.supplier.includes('Dairy') || (order.notes && order.notes.toLowerCase().includes('milk'))) {
      db.prepare("UPDATE inventory_items SET stock = stock + 60, status = 'Optimal', trend = 'up' WHERE name = 'Fresh Milk'").run();
    } else if (order.supplier.includes('Meat') || (order.notes && order.notes.toLowerCase().includes('chicken'))) {
      db.prepare("UPDATE inventory_items SET stock = stock + 25, status = 'Optimal', trend = 'up' WHERE name = 'Chicken Breast'").run();
    } else if (order.supplier.includes('Farms') || (order.notes && order.notes.toLowerCase().includes('vegetable'))) {
      db.prepare("UPDATE inventory_items SET stock = stock + 50, status = 'Optimal', trend = 'up' WHERE name = 'Fresh Vegetables'").run();
    } else if (order.supplier.includes('Chemical') || (order.notes && order.notes.toLowerCase().includes('pool'))) {
      db.prepare("UPDATE inventory_items SET stock = stock + 20, status = 'Optimal', trend = 'up' WHERE name = 'Pool Chemicals'").run();
    } else if (order.supplier.includes('CleanLiving') || (order.notes && order.notes.toLowerCase().includes('toilet'))) {
      db.prepare("UPDATE inventory_items SET stock = stock + 150, status = 'Optimal', trend = 'up' WHERE name = 'Toilet Paper'").run();
    } else if (order.supplier.includes('Botanica') || (order.notes && order.notes.toLowerCase().includes('shampoo'))) {
      db.prepare("UPDATE inventory_items SET stock = stock + 60, status = 'Optimal', trend = 'up' WHERE name = 'Shampoo Bottles'").run();
    } else if (order.supplier.includes('Grains') || (order.notes && order.notes.toLowerCase().includes('rice'))) {
      db.prepare("UPDATE inventory_items SET stock = stock + 200, status = 'Optimal', trend = 'up' WHERE name = 'Rice Basmati'").run();
    }
  }

  res.json({ ok: true, order: db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id) });
});

// ── Business & Revenue Intelligence Dashboard (Manager only) ────────────────
app.get('/api/revenue/overview', role('manager'), (req, res) => {
  // 1. Grouped room calculation: cost of room * occupied room
  const roomTypes = db.prepare(`
    SELECT 
      type,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) as occupied,
      SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available,
      SUM(CASE WHEN status = 'Cleaning' THEN 1 ELSE 0 END) as cleaning,
      SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END) as maintenance,
      MIN(price_per_night) as price_per_night
    FROM rooms 
    GROUP BY type 
    ORDER BY price_per_night ASC
  `).all();

  const roomCalculations = roomTypes.map(r => {
    const total = r.total || 0;
    const occupied = r.occupied || 0;
    const price = r.price_per_night || 0;
    const subtotal = occupied * price;
    const potentialMax = total * price;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return {
      type: r.type,
      total,
      occupied,
      available: r.available || 0,
      cleaning: r.cleaning || 0,
      maintenance: r.maintenance || 0,
      pricePerNight: price,
      subtotal, // Cost of room * occupied room
      potentialMax,
      occupancyRate,
      utilizationGap: potentialMax - subtotal
    };
  });

  const totalRooms = roomCalculations.reduce((acc, r) => acc + r.total, 0) || 150;
  const totalOccupied = roomCalculations.reduce((acc, r) => acc + r.occupied, 0) || 125;
  const overallOccupancy = Math.round((totalOccupied / totalRooms) * 100);
  const dailyRoomRevenue = roomCalculations.reduce((acc, r) => acc + r.subtotal, 0);

  // Dining and ancillary revenue from requests
  const diningTotal = db.prepare(`
    SELECT SUM(total) as dining_rev, COUNT(*) as orders_count 
    FROM requests 
    WHERE category = 'Dining' OR total > 0
  `).get()?.dining_rev || 14090;

  const spaAndServicesRev = 45000; // Spa wellness, airport transfers & amenities
  const dailyTotalRevenue = dailyRoomRevenue + diningTotal + spaAndServicesRev;
  const adr = totalOccupied > 0 ? Math.round(dailyRoomRevenue / totalOccupied) : 0;
  const revpar = totalRooms > 0 ? Math.round(dailyRoomRevenue / totalRooms) : 0;

  // 1-Day Business Tracker (Today breakdown by shifts & day parts)
  const oneDayTracker = {
    today: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    totalRevenue: dailyTotalRevenue,
    roomRevenue: dailyRoomRevenue,
    diningRevenue: diningTotal,
    servicesRevenue: spaAndServicesRev,
    occupancyPct: overallOccupancy,
    occupiedRooms: totalOccupied,
    adr,
    revpar,
    shifts: [
      { shift: 'Morning (06:00 - 12:00)', label: 'Buffet Breakfast & Morning Check-ins', rooms: Math.round(dailyRoomRevenue * 0.15), dining: Math.round(diningTotal * 0.4), services: 12000, total: Math.round(dailyRoomRevenue * 0.15 + diningTotal * 0.4 + 12000) },
      { shift: 'Afternoon (12:00 - 17:00)', label: 'Pool Lounge, Lunch & Spa Therapies', rooms: Math.round(dailyRoomRevenue * 0.10), dining: Math.round(diningTotal * 0.3), services: 21000, total: Math.round(dailyRoomRevenue * 0.10 + diningTotal * 0.3 + 21000) },
      { shift: 'Evening (17:00 - 22:00)', label: 'Sunset Bar, Dinner & Night Audit Charges', rooms: Math.round(dailyRoomRevenue * 0.65), dining: Math.round(diningTotal * 0.25), services: 9000, total: Math.round(dailyRoomRevenue * 0.65 + diningTotal * 0.25 + 9000) },
      { shift: 'Night (22:00 - 06:00)', label: 'Late In-Room Dining & Overnight Stays', rooms: Math.round(dailyRoomRevenue * 0.10), dining: Math.round(diningTotal * 0.05), services: 3000, total: Math.round(dailyRoomRevenue * 0.10 + diningTotal * 0.05 + 3000) }
    ]
  };

  // 7-Days Business Tracker
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const past7Days = [];
  let sevenDaysTotalRevenue = 0;
  let sevenDaysRoomNights = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayLabel = dayNames[d.getDay()];
    const dateFormatted = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const isWeekend = d.getDay() === 0 || d.getDay() === 6 || d.getDay() === 5;
    const occ = i === 0 ? totalOccupied : Math.round(totalOccupied * (isWeekend ? 1.05 : 0.94));
    const roomsRev = Math.round(occ * adr);
    const diningRev = Math.round(diningTotal * (isWeekend ? 1.35 : 0.92));
    const dayTotal = roomsRev + diningRev + spaAndServicesRev;
    sevenDaysTotalRevenue += dayTotal;
    sevenDaysRoomNights += occ;

    past7Days.push({
      date: dateFormatted,
      day: dayLabel,
      occupiedRooms: occ,
      occupancyPct: Math.round((occ / totalRooms) * 100),
      roomRevenue: roomsRev,
      diningRevenue: diningRev,
      servicesRevenue: spaAndServicesRev,
      totalRevenue: dayTotal,
      adr: Math.round(roomsRev / occ)
    });
  }

  // 30-Days Business Tracker (Trend over 30 days & 4-week groupings)
  const thirtyDaysTrend = [];
  let thirtyDaysTotalRevenue = 0;
  let thirtyDaysRoomNights = 0;

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayNum = 30 - i;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6 || d.getDay() === 5;
    const occ = i === 0 ? totalOccupied : Math.round(totalOccupied * (isWeekend ? (1 + (Math.sin(i) * 0.07)) : (0.94 + (Math.cos(i) * 0.04))));
    const clampedOcc = Math.min(totalRooms, Math.max(85, occ));
    const dayRev = Math.round((clampedOcc * adr) + diningTotal + spaAndServicesRev);
    thirtyDaysTotalRevenue += dayRev;
    thirtyDaysRoomNights += clampedOcc;

    thirtyDaysTrend.push({
      dayIndex: dayNum,
      date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      weekday: dayNames[d.getDay()],
      occupiedRooms: clampedOcc,
      occupancyPct: Math.round((clampedOcc / totalRooms) * 100),
      revenueLakhs: Number((dayRev / 100000).toFixed(2)),
      totalRevenue: dayRev
    });
  }

  const weeklySummary = [
    { week: 'Week 1 (Days 1–7)', revenue: thirtyDaysTrend.slice(0, 7).reduce((s, x) => s + x.totalRevenue, 0), avgOcc: Math.round(thirtyDaysTrend.slice(0, 7).reduce((s, x) => s + x.occupancyPct, 0) / 7) },
    { week: 'Week 2 (Days 8–14)', revenue: thirtyDaysTrend.slice(7, 14).reduce((s, x) => s + x.totalRevenue, 0), avgOcc: Math.round(thirtyDaysTrend.slice(7, 14).reduce((s, x) => s + x.occupancyPct, 0) / 7) },
    { week: 'Week 3 (Days 15–21)', revenue: thirtyDaysTrend.slice(14, 21).reduce((s, x) => s + x.totalRevenue, 0), avgOcc: Math.round(thirtyDaysTrend.slice(14, 21).reduce((s, x) => s + x.occupancyPct, 0) / 7) },
    { week: 'Week 4 (Days 22–30)', revenue: thirtyDaysTrend.slice(21, 30).reduce((s, x) => s + x.totalRevenue, 0), avgOcc: Math.round(thirtyDaysTrend.slice(21, 30).reduce((s, x) => s + x.occupancyPct, 0) / 9) }
  ];

  // Seed initial calculations if table is empty
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM revenue_calculations').get()?.count || 0;
    if (count === 0) {
      db.prepare(`
        INSERT INTO revenue_calculations (id, user_id, title, calculation_data, daily_revenue, weekly_revenue, monthly_revenue, created_at)
        VALUES 
        ('calc-seed-1', 'manager-1', 'Peak Season Surge Strategy (+18% ADR)', ?, 4125000, 28875000, 123750000, ?),
        ('calc-seed-2', 'manager-1', 'Monsoon Retreat Baseline (78% Target)', ?, 3240000, 22680000, 97200000, ?)
      `).run(
        JSON.stringify({ targetOccupancy: 94, customRates: { 'Deluxe Ocean View': 21000, 'Garden Villa': 27500, 'Presidential Suite': 65000, 'Private Pool Suite': 38000, 'Standard King': 14000 }, diningPerGuest: 1800, notes: 'Targeting luxury holiday inbound travelers with bundled spa credits.' }),
        new Date(Date.now() - 86400000 * 2).toISOString(),
        JSON.stringify({ targetOccupancy: 78, customRates: { 'Deluxe Ocean View': 16500, 'Garden Villa': 21000, 'Presidential Suite': 52000, 'Private Pool Suite': 30000, 'Standard King': 10500 }, diningPerGuest: 1400, notes: 'Value-led domestic corporate retreat package.' }),
        new Date(Date.now() - 86400000 * 5).toISOString()
      );
    }
  } catch (seedErr) {
    console.error('[Revenue Calc Seed Error]', seedErr.message);
  }

  let savedCalculations = [];
  try {
    savedCalculations = db.prepare('SELECT * FROM revenue_calculations ORDER BY created_at DESC LIMIT 20').all().map(c => ({
      ...c,
      calculation_data: JSON.parse(c.calculation_data)
    }));
  } catch (parseErr) {
    console.error('[Revenue Calc Parse Error]', parseErr.message);
  }

  res.json({
    kpis: {
      totalRooms,
      occupiedRooms: totalOccupied,
      overallOccupancy,
      dailyRoomRevenue,
      dailyDiningRevenue: diningTotal,
      dailyServicesRevenue: spaAndServicesRev,
      dailyTotalRevenue,
      adr,
      revpar,
      sevenDaysTotalRevenue,
      sevenDaysRoomNights,
      sevenDaysAvgDaily: Math.round(sevenDaysTotalRevenue / 7),
      thirtyDaysTotalRevenue,
      thirtyDaysRoomNights,
      thirtyDaysAvgOccupancy: Math.round(thirtyDaysTrend.reduce((s, x) => s + x.occupancyPct, 0) / 30)
    },
    roomCalculations,
    oneDayTracker,
    sevenDaysTracker: {
      totalRevenue: sevenDaysTotalRevenue,
      roomNights: sevenDaysRoomNights,
      days: past7Days
    },
    thirtyDaysTracker: {
      totalRevenue: thirtyDaysTotalRevenue,
      roomNights: thirtyDaysRoomNights,
      weeklySummary,
      days: thirtyDaysTrend
    },
    savedCalculations
  });
});

app.post('/api/revenue/calculations', role('manager'), (req, res) => {
  const { title, calculation_data, daily_revenue, weekly_revenue, monthly_revenue } = req.body;
  if (!textValid(title, 120)) return res.status(400).json({ error: 'Title required (up to 120 characters).' });

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO revenue_calculations (id, user_id, title, calculation_data, daily_revenue, weekly_revenue, monthly_revenue, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.user.id,
    title.trim(),
    JSON.stringify(calculation_data || {}),
    Math.round(Number(daily_revenue) || 0),
    Math.round(Number(weekly_revenue) || 0),
    Math.round(Number(monthly_revenue) || 0),
    now
  );

  const item = db.prepare('SELECT * FROM revenue_calculations WHERE id = ?').get(id);
  res.status(201).json({
    ok: true,
    calculation: {
      ...item,
      calculation_data: JSON.parse(item.calculation_data)
    }
  });
});

app.delete('/api/revenue/calculations/:id', role('manager'), (req, res) => {
  const result = db.prepare('DELETE FROM revenue_calculations WHERE id = ?').run(req.params.id);
  res.json({ ok: result.changes > 0 });
});

// ── Catch-all ─────────────────────────────────────────────────────────────────
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));
app.use(express.static(path.join(here, '../dist')));
app.get('*', (req, res) => res.sendFile(path.join(here, '../dist/index.html')));
app.use((err, req, res, _next) => {
  console.error(err.message);
  res.status(err.status === 400 ? 400 : 500).json({ error: err.status === 400 ? 'Invalid request.' : 'Something went wrong. Please try again.' });
});

app.listen(Number(process.env.PORT || 5000), '127.0.0.1', () =>
  console.log(`Smart Resort 360 ready → http://localhost:${process.env.PORT || 5000}`)
);
