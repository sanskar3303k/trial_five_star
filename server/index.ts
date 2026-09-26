import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const db = new Database(path.join(__dirname, 'resort.db'));

// Create tables
db.exec(`
  -- Staff Table
  CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    shift TEXT NOT NULL,
    status TEXT DEFAULT 'available',
    workload INTEGER DEFAULT 0,
    skills TEXT,
    avatar TEXT
  );

  -- Equipment Table
  CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT DEFAULT 'optimal',
    health_score INTEGER DEFAULT 100,
    last_maintenance TEXT,
    next_maintenance TEXT,
    failure_risk INTEGER DEFAULT 0,
    temperature REAL,
    vibration REAL,
    operating_hours INTEGER DEFAULT 0
  );

  -- Inventory Table
  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    unit TEXT NOT NULL,
    consumption_rate INTEGER DEFAULT 0,
    days_remaining REAL DEFAULT 0,
    supplier TEXT,
    status TEXT DEFAULT 'in-stock'
  );

  -- Guests Table
  CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    room TEXT,
    check_in TEXT,
    check_out TEXT,
    vip_status INTEGER DEFAULT 0,
    preferences TEXT,
    satisfaction INTEGER DEFAULT 5,
    total_spend INTEGER DEFAULT 0
  );

  -- Reviews Table
  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    guest_name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    sentiment TEXT,
    category TEXT,
    date TEXT
  );

  -- Pricing Rules Table
  CREATE TABLE IF NOT EXISTS pricing_rules (
    id TEXT PRIMARY KEY,
    room_type TEXT NOT NULL,
    base_price INTEGER NOT NULL,
    current_price INTEGER NOT NULL,
    recommended_price INTEGER,
    demand TEXT DEFAULT 'medium',
    confidence INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active'
  );

  -- Bookings Table
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    guest_id TEXT,
    room_type TEXT,
    check_in TEXT,
    check_out TEXT,
    total_amount INTEGER,
    status TEXT DEFAULT 'confirmed'
  );

  -- Alerts Table
  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    is_read INTEGER DEFAULT 0,
    created_at TEXT
  );
`);

// Seed initial data if tables are empty
const staffCount = db.prepare('SELECT COUNT(*) as count FROM staff').get() as { count: number };
if (staffCount.count === 0) {
  seedDatabase();
}

function seedDatabase() {
  // Insert sample staff
  const insertStaff = db.prepare(`
    INSERT INTO staff (id, name, role, department, shift, status, workload, skills, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const staffData = [
    ['s1', 'Ramesh Kumar', 'Housekeeper', 'Housekeeping', 'Morning', 'busy', 92, '["cleaning","laundry"]', 'https://i.pravatar.cc/150?img=11'],
    ['s2', 'Priya Sharma', 'Receptionist', 'Front Desk', 'Morning', 'available', 65, '["check-in","concierge"]', 'https://i.pravatar.cc/150?img=5'],
    ['s3', 'Amit Singh', 'Maintenance', 'Engineering', 'Day', 'busy', 78, '["electrical","plumbing","hvac"]', 'https://i.pravatar.cc/150?img=12'],
    ['s4', 'Sunita Devi', 'Housekeeper', 'Housekeeping', 'Morning', 'busy', 88, '["cleaning","turndown"]', 'https://i.pravatar.cc/150?img=9'],
    ['s5', 'Vikram Joshi', 'Chef', 'Kitchen', 'Morning', 'available', 70, '["indian","continental","pastry"]', 'https://i.pravatar.cc/150?img=13'],
    ['s6', 'Anita Rao', 'Spa Therapist', 'Spa', 'Day', 'available', 55, '["ayurveda","massage","facials"]', 'https://i.pravatar.cc/150?img=16'],
    ['s7', 'Deepak Patel', 'Housekeeper', 'Housekeeping', 'Evening', 'available', 45, '["cleaning","laundry"]', 'https://i.pravatar.cc/150?img=14'],
    ['s8', 'Meera Gupta', 'Restaurant Server', 'F&B', 'Evening', 'available', 60, '["serving","bartending"]', 'https://i.pravatar.cc/150?img=20'],
  ];

  staffData.forEach(s => insertStaff.run(...s));

  // Insert sample equipment
  const insertEquipment = db.prepare(`
    INSERT INTO equipment (id, name, location, status, health_score, last_maintenance, next_maintenance, failure_risk, temperature, vibration, operating_hours)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const equipmentData = [
    ['e1', 'Pool Pump #1', 'Main Pool', 'optimal', 92, '2026-08-15', '2026-11-15', 8, 68, 2.3, 3200],
    ['e2', 'Pool Pump #2', 'Infinity Pool', 'warning', 62, '2026-06-20', '2026-09-20', 78, 84, 4.8, 4210],
    ['e3', 'HVAC Unit - Block A', 'Building A', 'optimal', 88, '2026-09-01', '2026-12-01', 12, 72, 1.8, 5600],
    ['e4', 'HVAC Unit - Block B', 'Building B', 'optimal', 85, '2026-08-28', '2026-11-28', 15, 74, 2.1, 5450],
    ['e5', 'Generator', 'Power Room', 'optimal', 90, '2026-07-10', '2026-10-10', 10, 65, 1.5, 2800],
    ['e6', 'Water Treatment Plant', 'Utility Area', 'warning', 72, '2026-05-05', '2026-08-05', 35, 78, 3.2, 6100],
    ['e7', 'Elevator #1', 'Main Building', 'optimal', 95, '2026-09-10', '2026-12-10', 5, 45, 0.8, 4200],
    ['e8', 'Kitchen Exhaust System', 'Main Kitchen', 'optimal', 82, '2026-07-25', '2026-10-25', 18, 55, 2.5, 3800],
  ];

  equipmentData.forEach(e => insertEquipment.run(...e));

  // Insert sample inventory
  const insertInventory = db.prepare(`
    INSERT INTO inventory (id, name, category, current_stock, min_stock, unit, consumption_rate, days_remaining, supplier, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const inventoryData = [
    ['i1', 'Organic Milk', 'Food & Beverage', 120, 50, 'Liters', 65, 1.8, 'Mewar Dairy', 'critical'],
    ['i2', 'Fresh Vegetables', 'Food & Beverage', 85, 40, 'Kg', 25, 3.4, 'Local Farm', 'in-stock'],
    ['i3', 'Chicken', 'Food & Beverage', 45, 20, 'Kg', 15, 3.0, 'Poultry Farm', 'in-stock'],
    ['i4', 'Bath Towels', 'Housekeeping', 180, 100, 'Units', 12, 15.0, 'Textile Co', 'in-stock'],
    ['i5', 'Bed Sheets', 'Housekeeping', 95, 50, 'Units', 8, 11.9, 'Textile Co', 'in-stock'],
    ['i6', 'Toiletries Kit', 'Housekeeping', 220, 100, 'Units', 25, 8.8, 'Cosmetic Ltd', 'in-stock'],
    ['i7', 'Spa Oils', 'Spa', 35, 20, 'Liters', 5, 7.0, 'Ayurveda Co', 'in-stock'],
    ['i8', 'Pool Chemicals', 'Maintenance', 28, 15, 'Kg', 3, 9.3, 'ChemCorp', 'in-stock'],
  ];

  inventoryData.forEach(i => insertInventory.run(...i));

  // Insert sample guests
  const insertGuest = db.prepare(`
    INSERT INTO guests (id, name, room, check_in, check_out, vip_status, preferences, satisfaction, total_spend)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const guestData = [
    ['g1', 'Rohan Mehra', '104', '2026-09-20', '2026-09-25', 1, '{"dietary":["vegetarian"],"interests":["spa","yoga"]}', 5, 125000],
    ['g2', 'Priya Nair', '105', '2026-09-21', '2026-09-24', 1, '{"dietary":["vegan"],"interests":["adventure","photography"]}', 4, 85000],
    ['g3', 'Amit Patel', '201', '2026-09-22', '2026-09-26', 0, '{"dietary":[],"interests":["food","culture"]}', 5, 62000],
    ['g4', 'Sarah Johnson', '102', '2026-09-23', '2026-09-28', 1, '{"dietary":["gluten-free"],"interests":["spa","nature"]}', 5, 145000],
    ['g5', 'Vikram Singh', '301', '2026-09-20', '2026-09-27', 1, '{"dietary":[],"interests":["golf","business"]}', 4, 250000],
  ];

  guestData.forEach(g => insertGuest.run(...g));

  // Insert sample reviews
  const insertReview = db.prepare(`
    INSERT INTO reviews (id, guest_name, rating, comment, sentiment, category, date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const reviewData = [
    ['r1', 'Rohan Mehra', 5, 'Amazing spa experience! The Abhyanga massage was incredibly relaxing. Staff was very attentive.', 'positive', 'Spa', '2026-09-21'],
    ['r2', 'Priya Nair', 4, 'Beautiful property with great views. Food was delicious but room service was a bit slow.', 'positive', 'Room Service', '2026-09-22'],
    ['r3', 'Amit Patel', 5, 'Outstanding dinner at the restaurant. Chef Vikram created a special menu for us. Highly recommend!', 'positive', 'Restaurant', '2026-09-23'],
    ['r4', 'Sarah Johnson', 5, 'Perfect anniversary celebration. The team arranged flowers, cake, and a private dinner. Exceeded expectations!', 'positive', 'Guest Experience', '2026-09-24'],
    ['r5', 'Vikram Singh', 3, 'Golf course needs maintenance. Found the greens uneven. Room was comfortable though.', 'neutral', 'Facilities', '2026-09-22'],
    ['r6', 'Neha Gupta', 2, 'Room was not ready at check-in time. Waited 45 minutes. Disappointing start to vacation.', 'negative', 'Check-in', '2026-09-23'],
    ['r7', 'Raj Malhotra', 5, 'Best resort in Udaipur! Lake views are stunning. Will definitely return.', 'positive', 'Overall', '2026-09-24'],
    ['r8', 'Ananya Rao', 4, 'Loved the sunrise yoga session. Would appreciate more vegetarian options on the menu.', 'positive', 'Activities', '2026-09-22'],
  ];

  reviewData.forEach(r => insertReview.run(...r));

  // Insert sample pricing rules
  const insertPricing = db.prepare(`
    INSERT INTO pricing_rules (id, room_type, base_price, current_price, recommended_price, demand, confidence, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const pricingData = [
    ['p1', 'Deluxe Suite', 12000, 14500, 15200, 'high', 94, 'active'],
    ['p2', 'Premium Villa', 25000, 28000, 31000, 'surge', 89, 'pending'],
    ['p3', 'Standard Room', 6000, 6500, 6800, 'medium', 92, 'active'],
    ['p4', 'Royal Suite', 45000, 52000, 55000, 'high', 87, 'pending'],
    ['p5', 'Lake View Room', 15000, 17500, 18200, 'high', 91, 'active'],
  ];

  pricingData.forEach(p => insertPricing.run(...p));

  console.log('✅ Database seeded with sample data');
}

// ============================================
// API Routes
// ============================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// STAFF SCHEDULING APIs
// ============================================

app.get('/api/staff', (req, res) => {
  const staff = db.prepare('SELECT * FROM staff').all();
  res.json(staff);
});

app.put('/api/staff/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  
  db.prepare(`UPDATE staff SET ${fields} WHERE id = ?`).run(...values);
  
  const updated = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
  broadcast({ type: 'staff_updated', data: updated });
  
  res.json(updated);
});

app.post('/api/staff/optimize', (req, res) => {
  // AI-driven staff optimization algorithm
  const staff = db.prepare('SELECT * FROM staff').all() as any[];
  
  // Calculate department workload
  const deptWorkload = staff.reduce((acc, s) => {
    acc[s.department] = acc[s.department] || { total: 0, count: 0 };
    acc[s.department].total += s.workload;
    acc[s.department].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const recommendations: any[] = [];
  
  Object.entries(deptWorkload).forEach(([dept, data]) => {
    const avg = data.total / data.count;
    if (avg > 85) {
      // Find available staff from other departments
      const available = staff.filter(s => s.workload < 60 && s.department !== dept);
      if (available.length > 0) {
        recommendations.push({
          type: 'redeployment',
          priority: 'high',
          department: dept,
          currentWorkload: avg,
          suggestedStaff: available.slice(0, 2).map(s => s.name),
          impact: `Reduce workload from ${Math.round(avg)}% to ${Math.round(avg * 0.75)}%`
        });
      }
    }
  });

  res.json({ recommendations });
});

// ============================================
// PREDICTIVE MAINTENANCE APIs
// ============================================

app.get('/api/equipment', (req, res) => {
  const equipment = db.prepare('SELECT * FROM equipment').all();
  res.json(equipment);
});

app.post('/api/equipment/predict-failures', (req, res) => {
  const equipment = db.prepare('SELECT * FROM equipment').all() as any[];
  
  const predictions = equipment.map(eq => {
    // Multi-factor failure prediction algorithm
    let risk = eq.failure_risk;
    
    // Temperature factor (normal ~70°C)
    if (eq.temperature > 80) {
      risk += (eq.temperature - 70) * 2;
    }
    
    // Vibration factor (normal < 3.0 mm/s)
    if (eq.vibration > 3.5) {
      risk += (eq.vibration - 3.0) * 15;
    }
    
    // Operating hours factor
    if (eq.operating_hours > 4000) {
      risk += (eq.operating_hours - 4000) / 100;
    }
    
    risk = Math.min(100, Math.max(0, risk));
    
    return {
      ...eq,
      predicted_risk: Math.round(risk),
      recommendation: risk > 70 ? 'Immediate maintenance required' : 
                      risk > 50 ? 'Schedule maintenance within 3 days' : 
                      risk > 30 ? 'Monitor closely' : 'Normal operation',
      urgency: risk > 70 ? 'critical' : risk > 50 ? 'high' : risk > 30 ? 'medium' : 'low'
    };
  });

  // Sort by risk
  predictions.sort((a, b) => b.predicted_risk - a.predicted_risk);

  res.json(predictions);
});

app.put('/api/equipment/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  
  db.prepare(`UPDATE equipment SET ${fields} WHERE id = ?`).run(...values);
  
  const updated = db.prepare('SELECT * FROM equipment WHERE id = ?').get(id);
  broadcast({ type: 'equipment_updated', data: updated });
  
  res.json(updated);
});

// ============================================
// INVENTORY OPTIMIZATION APIs
// ============================================

app.get('/api/inventory', (req, res) => {
  const inventory = db.prepare('SELECT * FROM inventory').all();
  res.json(inventory);
});

app.post('/api/inventory/predict-stockouts', (req, res) => {
  const inventory = db.prepare('SELECT * FROM inventory').all() as any[];
  
  const predictions = inventory.map(item => {
    const daysUntilStockout = item.current_stock / item.consumption_rate;
    const stockoutRisk = daysUntilStockout < 3 ? 
      Math.round((3 - daysUntilStockout) / 3 * 100) : 0;
    
    return {
      ...item,
      days_until_stockout: daysUntilStockout.toFixed(1),
      stockout_risk: stockoutRisk,
      recommended_order: stockoutRisk > 50 ? 
        Math.round(item.min_stock * 2 - item.current_stock) : 0,
      status: stockoutRisk > 70 ? 'critical' : 
              stockoutRisk > 40 ? 'warning' : 'safe'
    };
  });

  predictions.sort((a, b) => b.stockout_risk - a.stockout_risk);

  res.json(predictions);
});

app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  
  db.prepare(`UPDATE inventory SET ${fields} WHERE id = ?`).run(...values);
  
  const updated = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
  broadcast({ type: 'inventory_updated', data: updated });
  
  res.json(updated);
});

// ============================================
// GUEST EXPERIENCE APIs
// ============================================

app.get('/api/guests', (req, res) => {
  const guests = db.prepare('SELECT * FROM guests').all();
  res.json(guests);
});

app.get('/api/guests/:id', (req, res) => {
  const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(req.params.id);
  res.json(guest);
});

app.post('/api/guests/recommendations', (req, res) => {
  const { guestId } = req.body;
  
  const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(guestId) as any;
  
  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  const preferences = JSON.parse(guest.preferences || '{}');
  
  const recommendations: any[] = [];
  
  // Generate personalized recommendations based on preferences
  if (preferences.interests?.includes('spa')) {
    recommendations.push({
      type: 'spa',
      title: 'Abhyanga Massage',
      description: 'Based on your interest in wellness, we recommend our signature Ayurvedic massage',
      timing: 'Available today at 4:00 PM',
      price: 6500
    });
  }
  
  if (preferences.interests?.includes('adventure')) {
    recommendations.push({
      type: 'activity',
      title: 'Sunset Boat Cruise',
      description: 'Experience the breathtaking views of Lake Pichola at sunset',
      timing: '5:30 PM departure',
      price: 3500
    });
  }
  
  if (preferences.dietary?.includes('vegetarian') || preferences.dietary?.includes('vegan')) {
    recommendations.push({
      type: 'dining',
      title: 'Farm-to-Table Vegetarian Dinner',
      description: 'Chef\'s special vegetarian menu using organic local produce',
      timing: '7:00 PM - 10:00 PM',
      price: 2500
    });
  }

  res.json({ guest, recommendations });
});

// ============================================
// AI CONCIERGE APIs
// ============================================

app.post('/api/concierge/chat', (req, res) => {
  const { message, guestId } = req.body;
  
  // Simple rule-based chatbot (can be enhanced with NLP)
  const lowerMessage = message.toLowerCase();
  let response = '';
  let actions: string[] = [];

  if (lowerMessage.includes('spa') || lowerMessage.includes('massage')) {
    response = 'Our spa offers a range of Ayurvedic treatments. The Abhyanga massage (90 min) is available at ₹6,500. Would you like me to book a session for you?';
    actions = ['Book Spa Treatment'];
  } else if (lowerMessage.includes('restaurant') || lowerMessage.includes('dinner') || lowerMessage.includes('food')) {
    response = 'We have multiple dining options: Sheesh Mahal (fine dining), Lotus Brasserie (casual), and In-Room Dining. Would you like me to make a reservation?';
    actions = ['Reserve Table'];
  } else if (lowerMessage.includes('pool') || lowerMessage.includes('swim')) {
    response = 'Our infinity pool is open from 6:00 AM to 10:00 PM. Pool towels are available at the poolside. Would you like me to arrange poolside service?';
    actions = ['Request Pool Service'];
  } else if (lowerMessage.includes('checkout') || lowerMessage.includes('check out')) {
    response = 'Check-out time is 11:00 AM. Express check-out is available. Would you like me to arrange late check-out (subject to availability)?';
    actions = ['Request Late Checkout'];
  } else if (lowerMessage.includes('breakfast')) {
    response = 'Breakfast is served at The Royal Verandah from 6:30 AM to 10:30 AM. We offer Indian, Continental, and Asian options. Enjoy your meal!';
  } else if (lowerMessage.includes('thank')) {
    response = 'You\'re welcome! Is there anything else I can help you with?';
  } else {
    response = 'I\'m your AI concierge assistant. I can help you with spa bookings, restaurant reservations, activity scheduling, or any resort services. What would you like to know?';
    actions = ['View Activities', 'Book Spa', 'Reserve Table'];
  }

  res.json({ response, actions, timestamp: new Date().toISOString() });
});

// ============================================
// SENTIMENT ANALYSIS APIs
// ============================================

app.get('/api/reviews', (req, res) => {
  const reviews = db.prepare('SELECT * FROM reviews ORDER BY date DESC').all();
  res.json(reviews);
});

app.post('/api/reviews/analyze', (req, res) => {
  const reviews = db.prepare('SELECT * FROM reviews').all() as any[];
  
  // Simple sentiment analysis based on keywords
  const positiveWords = ['amazing', 'excellent', 'outstanding', 'wonderful', 'perfect', 'best', 'love', 'great', 'beautiful', 'relaxing'];
  const negativeWords = ['bad', 'poor', 'disappointing', 'slow', 'dirty', 'uncomfortable', 'worst', 'hate', 'terrible'];
  
  const analyzed = reviews.map(review => {
    const words = review.comment.toLowerCase().split(/\s+/);
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    words.forEach((word: string) => {
      if (positiveWords.some(pw => word.includes(pw))) positiveScore++;
      if (negativeWords.some(nw => word.includes(nw))) negativeScore++;
    });
    
    const sentimentScore = (positiveScore - negativeScore) / Math.max(words.length / 10, 1);
    
    let sentiment = 'neutral';
    if (sentimentScore > 0.3) sentiment = 'positive';
    else if (sentimentScore < -0.3) sentiment = 'negative';
    
    // Update database
    db.prepare('UPDATE reviews SET sentiment = ? WHERE id = ?').run(sentiment, review.id);
    
    return {
      ...review,
      sentiment,
      sentiment_score: sentimentScore.toFixed(2)
    };
  });

  // Category breakdown
  const categoryStats = analyzed.reduce((acc: any, review) => {
    const cat = review.category || 'General';
    acc[cat] = acc[cat] || { positive: 0, neutral: 0, negative: 0, total: 0 };
    acc[cat][review.sentiment]++;
    acc[cat].total++;
    return acc;
  }, {});

  res.json({
    reviews: analyzed,
    summary: {
      total: analyzed.length,
      positive: analyzed.filter(r => r.sentiment === 'positive').length,
      neutral: analyzed.filter(r => r.sentiment === 'neutral').length,
      negative: analyzed.filter(r => r.sentiment === 'negative').length
    },
    categoryStats
  });
});

// ============================================
// DYNAMIC PRICING APIs
// ============================================

app.get('/api/pricing', (req, res) => {
  const rules = db.prepare('SELECT * FROM pricing_rules').all();
  res.json(rules);
});

app.post('/api/pricing/calculate', (req, res) => {
  const { occupancyRate, seasonalFactor, competitorPrices } = req.body;
  
  const rules = db.prepare('SELECT * FROM pricing_rules').all() as any[];
  
  const recommendations = rules.map(rule => {
    // Dynamic pricing algorithm
    let recommendedPrice = rule.base_price;
    
    // Occupancy-based adjustment
    if (occupancyRate > 90) {
      recommendedPrice *= 1.25; // Surge pricing
    } else if (occupancyRate > 80) {
      recommendedPrice *= 1.15;
    } else if (occupancyRate < 50) {
      recommendedPrice *= 0.90; // Discount
    }
    
    // Seasonal adjustment
    recommendedPrice *= (1 + (seasonalFactor || 0) * 0.1);
    
    // Competitor positioning
    const competitorAvg = competitorPrices?.[rule.room_type] || rule.base_price * 1.1;
    if (recommendedPrice > competitorAvg * 1.1) {
      recommendedPrice = competitorAvg * 1.05; // Cap at 5% above market
    }
    
    const demand = occupancyRate > 90 ? 'surge' : occupancyRate > 75 ? 'high' : occupancyRate > 50 ? 'medium' : 'low';
    const confidence = Math.round(70 + (occupancyRate > 80 ? 20 : 10));
    
    return {
      ...rule,
      recommended_price: Math.round(recommendedPrice),
      demand,
      confidence,
      expected_revenue_lift: `${Math.round((recommendedPrice / rule.base_price - 1) * 100)}%`
    };
  });

  res.json(recommendations);
});

app.put('/api/pricing/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  
  db.prepare(`UPDATE pricing_rules SET ${fields} WHERE id = ?`).run(...values);
  
  const updated = db.prepare('SELECT * FROM pricing_rules WHERE id = ?').get(id);
  broadcast({ type: 'pricing_updated', data: updated });
  
  res.json(updated);
});

// ============================================
// DASHBOARD & ALERTS APIs
// ============================================

app.get('/api/dashboard/stats', (req, res) => {
  const totalRooms = 32;
  const occupiedRooms = Math.round(totalRooms * 0.91);
  
  const stats = {
    occupancy: {
      current: 91,
      trend: '+14%',
      forecast: [72, 68, 75, 82, 91, 96, 88]
    },
    revenue: {
      today: 482000,
      trend: '+12%',
      month: 3250000
    },
    staff: {
      total: 8,
      utilization: 87,
      departments: {
        'Housekeeping': 92,
        'Front Desk': 65,
        'Engineering': 78,
        'Kitchen': 70,
        'Spa': 55
      }
    },
    satisfaction: {
      score: 4.6,
      trend: '+0.2',
      reviews: 245
    }
  };

  res.json(stats);
});

app.get('/api/alerts', (req, res) => {
  const alerts = db.prepare('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 10').all();
  res.json(alerts);
});

// ============================================
// WebSocket for Real-time Updates
// ============================================

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected. Total clients:', clients.size);
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected. Total clients:', clients.size);
  });
});

function broadcast(message: any) {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(data);
    }
  });
}

// Simulate real-time updates
setInterval(() => {
  // Simulate equipment sensor updates
  const equipment = db.prepare('SELECT id, temperature, vibration FROM equipment WHERE status != ?').get('under_maintenance') as any;
  
  if (equipment) {
    const tempChange = (Math.random() - 0.5) * 2;
    const vibChange = (Math.random() - 0.5) * 0.2;
    
    const newTemp = equipment.temperature + tempChange;
    const newVib = equipment.vibration + vibChange;
    
    db.prepare('UPDATE equipment SET temperature = ?, vibration = ? WHERE id = ?')
      .run(newTemp, newVib, equipment.id);
    
    broadcast({
      type: 'sensor_update',
      data: { id: equipment.id, temperature: newTemp, vibration: newVib }
    });
  }
}, 5000);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Smart Resort 360 API running on http://localhost:${PORT}`);
  console.log('📊 WebSocket server running for real-time updates');
});

export { broadcast };
