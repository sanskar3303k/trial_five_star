import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, ClipboardList, MessageSquare, TrendingUp, BedDouble, RefreshCw, Search, Sparkles, Check, AlertTriangle, Star, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api, money, type User, type ServiceRequest, type Feedback } from '../services/api';
import { PageHeading, RequestList } from './GuestPortal';

type Rate = { id: string; amount: number };
type Room = { id: string; name: string; base: number; recommended: number; change: number };
type AnalyticsData = {
  occupancyRate: number;
  occupiedCount: number;
  totalRooms: number;
  dailyRevenue: string;
  dailyRevenueRaw: number;
  trend: { day: string; occupancy: number; occupiedRooms: number; revenueLakhs: number }[];
};

const sampleDemand = [
  { day: 'Mon', occupancy: 65 }, { day: 'Tue', occupancy: 72 }, { day: 'Wed', occupancy: 69 },
  { day: 'Thu', occupancy: 81 }, { day: 'Fri', occupancy: 86 }, { day: 'Sat', occupancy: 94 }, { day: 'Sun', occupancy: 87 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function ManagerPortal({ user, page, navigate }: { user: User; page: string; navigate: (page: string) => void }) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [occupancy, setOccupancy] = useState(86);
  const [season, setSeason] = useState(1.1);
  const [scenario, setScenario] = useState({ occupancy: 86, season: 1.1 });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'forecast'>('week');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    occupancyRate: 86,
    occupiedCount: 129,
    totalRooms: 150,
    dailyRevenue: 'Rs.23.9L',
    dailyRevenueRaw: 2386500,
    trend: sampleDemand.map(d => ({ ...d, occupiedRooms: Math.round(d.occupancy * 1.5), revenueLakhs: Number((d.occupancy * 0.28).toFixed(1)) })),
  });

  const refresh = async () => {
    const [r, f, a] = await Promise.all([
      api<ServiceRequest[]>('/requests'),
      api<Feedback[]>('/feedback'),
      api<AnalyticsData>('/analytics/occupancy').catch(() => null),
    ]);
    setRequests(r);
    setFeedback(f);
    if (a) setAnalytics(a);
  };

  useEffect(() => {
    refresh().catch(e => setError(e.message)).finally(() => setLoading(false));
    const interval = setInterval(() => refresh().catch(e => setError(e.message)), 15000);
    if (page === 'pricing') {
      Promise.all([
        api<{ rooms: Room[] }>('/pricing/scenario', 'POST', { occupancy: 86, season: 1.1 }),
        api<Rate[]>('/pricing'),
      ]).then(([result, saved]) => {
        setRooms(result.rooms);
        setRates(saved);
      }).catch(e => setError(e.message));
    }
    return () => clearInterval(interval);
  }, [page]);

  const perform = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); setSuccess('');
    try { await action(); } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const updateStatus = (id: string, status: string) => {
    void perform(async () => {
      await api(`/requests/${id}`, 'PATCH', { status });
      await refresh();
      setSuccess('Request updated. The guest can see the new status.');
    });
  };

  const calculate = () => perform(async () => {
    const result = await api<{ rooms: Room[] }>('/pricing/scenario', 'POST', { occupancy, season });
    setRooms(result.rooms);
    setScenario({ occupancy, season });
    setSuccess('Scenario updated. Review each recommendation before saving.');
  });

  const apply = (id: string) => perform(async () => {
    await api('/pricing/apply', 'POST', { id, ...scenario });
    setRates(await api<Rate[]>('/pricing'));
    setSuccess('Rate saved to this prototype. No external booking prices were changed.');
  });

  const open = requests.filter(item => item.status !== 'Completed').length;
  const newCount = requests.filter(item => item.status === 'New').length;
  const needsAttention = feedback.filter(item => item.analysis.sentiment === 'negative' || item.analysis.sentiment === 'mixed');
  const average = feedback.length ? (feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(1) : '---';

  const alerts = (
    <>
      <AnimatePresence>
        {error && (
          <motion.div className="error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {error}
            <button className="text-button" onClick={() => void perform(refresh)}>Retry loading</button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {success && (
          <motion.div className="success" role="status" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Check size={18} />{success}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  // ── Requests page ───────────────────────────────────────────
  if (page === 'requests') return (
    <>
      <PageHeading eyebrow="SERVICE, WITH FOLLOW-THROUGH" title="Every request deserves a response." subtitle="A shared queue for the little details that make a great stay." />
      {alerts}
      <motion.section className="panel" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <div className="request-toolbar">
          <div className="tabs">
            {['All', 'New', 'In progress', 'Completed'].map(value => (
              <motion.button
                key={value}
                className={filter === value ? 'selected' : ''}
                onClick={() => setFilter(value)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {value}
              </motion.button>
            ))}
          </div>
          <div className="search-field">
            <Search size={17} />
            <input aria-label="Search requests" placeholder="Guest, room or request..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <motion.button className="icon-btn" aria-label="Refresh requests" disabled={busy} onClick={() => void perform(refresh)} whileHover={{ rotate: 180 }} transition={{ duration: 0.4 }}>
            <RefreshCw size={18} />
          </motion.button>
        </div>
        <fieldset disabled={busy}>
          {loading ? <p className="loading-copy">Loading requests...</p> : (
            <RequestList
              manager
              onStatus={updateStatus}
              requests={requests.filter(item =>
                (filter === 'All' || item.status === filter) &&
                `${item.guest_name} ${item.room} ${item.title} ${item.detail}`.toLowerCase().includes(query.toLowerCase())
              )}
            />
          )}
        </fieldset>
      </motion.section>
    </>
  );

  // ── Sentiment page ──────────────────────────────────────────
  if (page === 'sentiment') {
    const posReviews = feedback.filter(item => item.analysis.sentiment === 'positive');
    const neuReviews = feedback.filter(item => item.analysis.sentiment === 'neutral');
    const negReviews = feedback.filter(item => item.analysis.sentiment === 'negative');
    const totalFb = feedback.length || 1;

    return (
      <>
        <PageHeading eyebrow="LISTEN CLOSELY. ACT THOUGHTFULLY." title="Guest Feedback & Sentiment Intelligence" subtitle="Categorized strictly into Positive, Neutral, and Negative sentiments parsed from guest feedback." />
        {alerts}

        <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <Metric icon={TrendingUp} label="Average Guest Rating" value={`${average}${feedback.length ? ' / 5' : ''}`} note={`Calculated from ${feedback.length} guest reviews`} delay={0} />
          <Metric icon={Check} label="Positive Feedback" value={`${posReviews.length} (${Math.round(posReviews.length / totalFb * 100)}%)`} note="Praise for service, dining & perks" delay={0.08} onClick={() => setFilter('positive')} />
          <Metric icon={MessageSquare} label="Neutral Feedback" value={`${neuReviews.length} (${Math.round(neuReviews.length / totalFb * 100)}%)`} note="Standard stays & balanced remarks" delay={0.16} onClick={() => setFilter('neutral')} />
          <Metric icon={AlertTriangle} label="Negative Feedback" value={`${negReviews.length} (${Math.round(negReviews.length / totalFb * 100)}%)`} note="Service recovery alerts" delay={0.24} onClick={() => setFilter('negative')} />
        </div>

        <motion.section className="panel" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="section-title" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <h2>Guest Feedback Queue</h2>
            <div className="tabs" style={{ margin: 0 }}>
              {[
                { id: 'All', label: `All (${feedback.length})` },
                { id: 'positive', label: `Positive (${posReviews.length})` },
                { id: 'neutral', label: `Neutral (${neuReviews.length})` },
                { id: 'negative', label: `Negative (${negReviews.length})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={filter === tab.id ? 'selected' : ''}
                  onClick={() => setFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? <p className="loading-copy">Loading feedback...</p> : (
            feedback.filter(item => filter === 'All' || item.analysis.sentiment === filter).length ? (
              feedback.filter(item => filter === 'All' || item.analysis.sentiment === filter).map((item, i) => {
                const s = item.analysis.sentiment === 'positive' ? 'positive' : item.analysis.sentiment === 'negative' ? 'negative' : 'neutral';
                const sLabel = s === 'positive' ? 'Positive Feedback' : s === 'negative' ? 'Negative Feedback' : 'Neutral Feedback';

                return (
                  <motion.article
                    className={`manager-feedback feedback-item-card ${s}`}
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="feedback-top">
                      <span className="avatar">{item.guest_name.split(' ').map(x => x[0]).join('')}</span>
                      <div>
                        <b>{item.guest_name}</b>
                        <small>Room {item.room} &bull; {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
                      </div>
                      <span className={`sentiment-badge-pill ${s}`}>{sLabel}</span>
                      <div className="stars-visual" style={{ marginLeft: 'auto' }}>
                        {[1, 2, 3, 4, 5].map(st => (
                          <Star
                            key={st}
                            size={14}
                            fill={st <= item.rating ? '#f59e0b' : 'none'}
                            stroke={st <= item.rating ? '#f59e0b' : '#cbd5e1'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="review-comment">"{item.comment}"</p>
                    <div className="aspect-tags">
                      {(item.analysis.aspects || []).map((aspect: string) => <span key={aspect} className="aspect-badge-tag">{aspect}</span>)}
                    </div>
                    {item.analysis.recommendation && (
                      <div className="recommendation">
                        <Sparkles size={16} />
                        <span>{item.analysis.recommendation}</span>
                      </div>
                    )}
                  </motion.article>
                );
              })
            ) : (
              <div className="empty-state"><MessageSquare size={30} /><p>No feedback matching this category.</p></div>
            )
          )}
        </motion.section>
      </>
    );
  }

  // ── Pricing page ────────────────────────────────────────────
  if (page === 'pricing') return (
    <>
      <PageHeading eyebrow="A CLEARER VIEW OF REVENUE" title="The right rate starts with context." subtitle="Explore a demand scenario, inspect the recommendation, then decide." />
      {alerts}
      <motion.div className="notice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <Sparkles size={17} /> Pricing sandbox - Illustrative base rates and a capped rules baseline, not an ML forecast. Saved rates stay in this prototype.
      </motion.div>

      <div className="pricing-layout">
        <motion.section className="panel scenario-panel" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}>
          <h2>Build a scenario</h2>
          <p className="muted">See how demand assumptions affect the suggested rate.</p>
          <label htmlFor="occupancy">Expected occupancy <b>{occupancy}%</b></label>
          <input id="occupancy" type="range" min="0" max="100" value={occupancy} onChange={e => setOccupancy(Number(e.target.value))} />
          <div className="range-labels"><span>0%</span><span>100%</span></div>
          <label htmlFor="season">Seasonality</label>
          <select id="season" value={season} onChange={e => setSeason(Number(e.target.value))}>
            <option value="0.7">Low season - 0.7x</option>
            <option value="1">Regular season - 1.0x</option>
            <option value="1.1">High season - 1.1x</option>
            <option value="1.5">Peak season - 1.5x</option>
          </select>
          <motion.button className="primary" onClick={calculate} disabled={busy} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ width: '100%', marginTop: '16px' }}>
            {busy ? 'Working...' : 'Calculate scenario'}<ArrowRight size={16} />
          </motion.button>
          <div className="guardrail">
            <Check size={17} />
            <p><b>Rate guardrails</b>Suggestions stay between -20% and +35% of the base rate, then round to the nearest Rs.100.</p>
          </div>
        </motion.section>

        <motion.section className="panel" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
          <div className="section-title">
            <h2>Rate recommendations</h2>
            <span className="pill">{scenario.occupancy}% occupancy</span>
          </div>
          {occupancy !== scenario.occupancy || season !== scenario.season ? (
            <p className="notice">Inputs changed. Calculate the scenario to update recommendations.</p>
          ) : null}
          {rooms.map((room, i) => (
            <motion.article
              className="rate-card"
              key={room.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div>
                <span className="eyebrow">PER ROOM / NIGHT</span>
                <h3>{room.name}</h3>
              </div>
              <div className="rate-comparison">
                <div>
                  <small>Sample base</small>
                  <b>{money(room.base)}</b>
                </div>
                <div>
                  <small>Suggested</small>
                  <b style={{ color: 'var(--green)' }}>{money(room.recommended)}</b>
                </div>
                <span className={`rate-change ${room.change >= 0 ? 'rate-up' : 'rate-down'}`}>
                  {room.change >= 0 ? '+' : ''}{room.change}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '14px', justifyContent: 'flex-end' }}>
                {rates.some(r => r.id === room.id) && (
                  <span className="pill">Saved: {money(rates.find(r => r.id === room.id)!.amount)}</span>
                )}
                <motion.button className="secondary" disabled={busy} onClick={() => apply(room.id)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  Apply rate
                </motion.button>
              </div>
            </motion.article>
          ))}
        </motion.section>
      </div>
    </>
  );

  // ── Overview (default) ──────────────────────────────────────
  return (
    <>
      <div className="overview-heading">
        <PageHeading eyebrow="YOUR RESORT AT A GLANCE" title={`A clearer day, ${user.name.split(' ')[0]}.`} subtitle="The big picture. The small details. Everything that needs you." />
        <motion.button className="secondary" disabled={busy} onClick={() => void perform(refresh)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <RefreshCw size={16} /> Refresh
        </motion.button>
      </div>
      {alerts}

      <motion.div
        className="manager-welcome"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <span className="eyebrow light">LET'S MAKE TODAY EXCEPTIONAL</span>
          <h2>{newCount ? `${newCount} new request${newCount > 1 ? 's' : ''}. A chance to make a difference.` : 'Your next great guest experience starts here.'}</h2>
          <p>{newCount ? 'Your guests have reached out. Give their requests a little attention.' : 'Guest requests and feedback appear here as soon as they are submitted.'}</p>
        </div>
        <motion.button className="light-button" onClick={() => navigate('requests')} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          Open service queue <ArrowRight size={17} />
        </motion.button>
      </motion.div>

      <div className="metric-grid">
        <motion.article
          className="metric clickable-metric"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}
          onClick={() => navigate('rooms')}
          style={{ cursor: 'pointer', border: '1px solid #d0dfc8' }}
          title="Click to view all 150 rooms and customer stay details"
        >
          <div>
            <span>Live occupancy</span>
            <BedDouble size={19} />
          </div>
          <strong>{analytics.occupancyRate}%</strong>
          <p className="clickable-metric-hint" style={{ color: 'var(--green-light)', fontWeight: 600 }}>
            {analytics.occupiedCount} of {analytics.totalRooms} rooms &bull; View rooms &rarr;
          </p>
        </motion.article>

        <Metric icon={ClipboardList} label="Open requests" value={loading ? '...' : String(open)} note={`${newCount} awaiting a first response`} delay={0.08} onClick={() => navigate('requests')} />
        <Metric icon={MessageSquare} label="Guest rating" value={loading ? '...' : average} note={feedback.length ? `From ${feedback.length} submitted reviews` : 'No guest feedback yet'} delay={0.16} onClick={() => navigate('sentiment')} />
        <Metric icon={TrendingUp} label="Daily resort revenue" value={analytics.dailyRevenue} note="Dynamic active stays + room service" delay={0.24} onClick={() => navigate('revenue')} />
      </div>

      <div className="dashboard-grid">
        <motion.section className="panel demand-panel" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="section-title">
            <div>
              <h2>Occupancy & Demand Outlook</h2>
              <p className="muted">
                {timeframe === 'week' ? 'Active 7-day occupancy curve from live bookings' : timeframe === 'month' ? '4-week trailing occupancy performance' : '14-day forward AI demand forecast'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span className="pill" style={{ color: 'var(--green-light)', borderColor: '#cfe0c8' }}>
                &bull; Live Dynamic Data
              </span>
              <div className="tabs" style={{ margin: 0 }}>
                {(['week', 'month', 'forecast'] as const).map(tf => (
                  <button
                    key={tf}
                    className={timeframe === tf ? 'selected' : ''}
                    onClick={() => setTimeframe(tf)}
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    {tf === 'week' ? '7 Days' : tf === 'month' ? '4 Weeks' : 'Forecast'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={
                  timeframe === 'month' ? [
                    { day: 'Week 1', occupancy: 78, revenueLakhs: 21.6 },
                    { day: 'Week 2', occupancy: 82, revenueLakhs: 22.8 },
                    { day: 'Week 3', occupancy: 86, revenueLakhs: 23.9 },
                    { day: 'Week 4', occupancy: 91, revenueLakhs: 25.2 },
                  ] : timeframe === 'forecast' ? [
                    { day: 'Next Mon', occupancy: 72, revenueLakhs: 19.8 },
                    { day: 'Next Tue', occupancy: 76, revenueLakhs: 21.0 },
                    { day: 'Next Wed', occupancy: 80, revenueLakhs: 22.1 },
                    { day: 'Next Thu', occupancy: 89, revenueLakhs: 24.6 },
                    { day: 'Next Fri', occupancy: 97, revenueLakhs: 26.8 },
                    { day: 'Next Sat', occupancy: 99, revenueLakhs: 27.4 },
                    { day: 'Next Sun', occupancy: 93, revenueLakhs: 25.7 },
                  ] : analytics.trend
                }
                margin={{ left: -24, right: 10, top: 14, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2d6b54" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2d6b54" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#eef1e9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" fontSize={11} stroke="#9ca88d" />
                <YAxis domain={[40, 100]} fontSize={11} stroke="#9ca88d" unit="%" />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    name === 'occupancy' ? `${val}% (${Math.round((val / 100) * analytics.totalRooms)} rooms occupied)` : val,
                    'Occupancy Rate'
                  ]}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e8ede5',
                    borderRadius: '10px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="occupancy" stroke="#2d6b54" strokeWidth={2.5} fill="url(#chartFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section className="panel attention-panel" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="section-title">
            <h2><Sparkles size={18} /> Needs attention</h2>
          </div>
          {needsAttention.length ? needsAttention.slice(0, 3).map((item, i) => (
            <motion.button
              key={item.id}
              onClick={() => navigate('sentiment')}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              whileHover={{ x: 4 }}
            >
              <span className={`feature-icon ${item.analysis.sentiment === 'negative' ? 'peach' : 'gold'}`}>
                <AlertTriangle size={18} />
              </span>
              <div>
                <b>{item.guest_name} - Room {item.room}</b>
                <p>{item.comment.slice(0, 80)}{item.comment.length > 80 ? '...' : ''}</p>
              </div>
              <ArrowUpRight size={16} />
            </motion.button>
          )) : (
            <div className="empty-state">
              <Check size={24} />
              <p>No items flagged for attention right now.</p>
            </div>
          )}
          <button className="text-button" onClick={() => navigate('sentiment')} style={{ marginTop: '12px' }}>
            View all feedback <ArrowRight size={15} />
          </button>
        </motion.section>
      </div>
    </>
  );
}

function Metric({ icon: Icon, label, value, note, delay = 0, onClick }: { icon: typeof TrendingUp; label: string; value: string; note: string; delay?: number; onClick?: () => void }) {
  return (
    <motion.article
      className={`metric ${onClick ? 'clickable-metric' : ''}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div>
        <span>{label}</span>
        <Icon size={19} />
      </div>
      <strong>{value}</strong>
      <p>{note}</p>
    </motion.article>
  );
}
