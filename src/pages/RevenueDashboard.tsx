import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, RefreshCw, Calculator, Calendar, Check, AlertCircle, Trash2,
  BookmarkCheck, PlusCircle, ArrowUpRight, BedDouble, Utensils, Sparkles,
  PieChart as PieIcon, BarChart3, Layers, DollarSign, Coins, HelpCircle, Save
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Legend
} from 'recharts';
import {
  api, money, formatINRShort, type RevenueOverview, type RoomCalculation,
  type SavedCalculation
} from '../services/api';
import { PageHeading } from './GuestPortal';

interface RevenueDashboardProps {
  navigate: (page: string) => void;
}

export default function RevenueDashboard({ navigate }: RevenueDashboardProps) {
  const [data, setData] = useState<RevenueOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<'1day' | '7days' | '30days'>('1day');

  // Calculator State
  const [simOccupancy, setSimOccupancy] = useState<number>(85);
  const [simRates, setSimRates] = useState<Record<string, number>>({});
  const [simDiningSpend, setSimDiningSpend] = useState<number>(1500);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scenarioTitle, setScenarioTitle] = useState('');
  const [scenarioNotes, setScenarioNotes] = useState('');

  const fetchRevenue = async () => {
    try {
      setError('');
      const res = await api<RevenueOverview>('/revenue/overview');
      setData(res);

      // Initialize simulator with current room prices if not set
      if (Object.keys(simRates).length === 0 && res.roomCalculations.length > 0) {
        const initialRates: Record<string, number> = {};
        res.roomCalculations.forEach(r => {
          initialRates[r.type] = r.pricePerNight;
        });
        setSimRates(initialRates);
        setSimOccupancy(res.kpis.overallOccupancy);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  // Simulator dynamic calculations
  const simulation = useMemo(() => {
    if (!data) return { daily: 0, weekly: 0, monthly: 0, roomRev: 0, diningRev: 0, variance: 0 };
    const totalRooms = data.kpis.totalRooms;
    const simOccupiedRooms = Math.round((simOccupancy / 100) * totalRooms);

    let calculatedRoomRev = 0;
    data.roomCalculations.forEach(r => {
      const rate = simRates[r.type] || r.pricePerNight;
      // Proportional room distribution based on capacity share
      const roomShare = r.total / totalRooms;
      const occForType = Math.round(simOccupiedRooms * roomShare);
      calculatedRoomRev += occForType * rate;
    });

    const calculatedDiningRev = simOccupiedRooms * simDiningSpend;
    const calculatedServicesRev = 45000;
    const dailyTotal = calculatedRoomRev + calculatedDiningRev + calculatedServicesRev;
    const weeklyTotal = dailyTotal * 7;
    const monthlyTotal = dailyTotal * 30;
    const variance = data.kpis.dailyTotalRevenue > 0
      ? Math.round(((dailyTotal - data.kpis.dailyTotalRevenue) / data.kpis.dailyTotalRevenue) * 100)
      : 0;

    return {
      daily: dailyTotal,
      weekly: weeklyTotal,
      monthly: monthlyTotal,
      roomRev: calculatedRoomRev,
      diningRev: calculatedDiningRev,
      variance,
      simOccupiedRooms
    };
  }, [data, simOccupancy, simRates, simDiningSpend]);

  const handleSaveCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenarioTitle.trim()) return;
    setBusy(true);
    try {
      const res = await api<{ ok: boolean; calculation: SavedCalculation }>('/revenue/calculations', 'POST', {
        title: scenarioTitle.trim(),
        calculation_data: {
          targetOccupancy: simOccupancy,
          customRates: simRates,
          diningPerGuest: simDiningSpend,
          notes: scenarioNotes.trim()
        },
        daily_revenue: simulation.daily,
        weekly_revenue: simulation.weekly,
        monthly_revenue: simulation.monthly
      });
      setSuccess(`Calculation scenario "${res.calculation.title}" saved successfully!`);
      setShowSaveModal(false);
      setScenarioTitle('');
      setScenarioNotes('');
      await fetchRevenue();
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCalculation = async (id: string) => {
    if (!confirm('Are you sure you want to remove this stored calculation?')) return;
    try {
      await api(`/revenue/calculations/${id}`, 'DELETE');
      setSuccess('Stored calculation deleted.');
      await fetchRevenue();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleLoadCalculation = (calc: SavedCalculation) => {
    if (calc.calculation_data.targetOccupancy !== undefined) {
      setSimOccupancy(calc.calculation_data.targetOccupancy);
    }
    if (calc.calculation_data.customRates) {
      setSimRates(calc.calculation_data.customRates);
    }
    if (calc.calculation_data.diningPerGuest) {
      setSimDiningSpend(calc.calculation_data.diningPerGuest);
    }
    setSuccess(`Loaded scenario: "${calc.title}"`);
    setTimeout(() => setSuccess(''), 3000);
    // Smooth scroll to calculator
    document.getElementById('revenue-calculator')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <div className="overview-heading" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <PageHeading
          eyebrow="FINANCIAL INTELLIGENCE & BUSINESS METRICS"
          title="Daily Revenue & Business Performance"
          subtitle="Real-time synchronization of room inventory math (Rate × Occupied rooms), multi-period business tracking & custom scenario calculator."
        />
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <motion.button
            className="secondary"
            disabled={busy || loading}
            onClick={() => { setLoading(true); fetchRevenue(); }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh Live Data</span>
          </motion.button>
          <motion.button
            className="primary"
            onClick={() => document.getElementById('revenue-calculator')?.scrollIntoView({ behavior: 'smooth' })}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Calculator size={15} />
            <span>Simulator Tool</span>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div className="error" role="alert" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <AlertCircle size={18} /> {error}
          </motion.div>
        )}
        {success && (
          <motion.div className="success" role="status" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Check size={18} /> {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Business KPIs ────────────────────────────────────── */}
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: '16px' }}>
        <motion.article
          className="metric"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div>
            <span>1-DAY BUSINESS (TODAY)</span>
            <DollarSign size={18} style={{ color: 'var(--green-light)' }} />
          </div>
          <strong>{data ? formatINRShort(data.kpis.dailyTotalRevenue) : '...'}</strong>
          <p>
            Rooms: {data ? formatINRShort(data.kpis.dailyRoomRevenue) : '...'} • Dining: {data ? formatINRShort(data.kpis.dailyDiningRevenue) : '...'}
          </p>
        </motion.article>

        <motion.article
          className="metric"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div>
            <span>7-DAYS BUSINESS TRACKER</span>
            <Calendar size={18} style={{ color: 'var(--green-light)' }} />
          </div>
          <strong>{data ? formatINRShort(data.kpis.sevenDaysTotalRevenue) : '...'}</strong>
          <p>
            {data?.kpis.sevenDaysRoomNights} room nights • Daily avg: {data ? formatINRShort(data.kpis.sevenDaysAvgDaily) : '...'}
          </p>
        </motion.article>

        <motion.article
          className="metric"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div>
            <span>30-DAYS BUSINESS TRACKER</span>
            <BarChart3 size={18} style={{ color: 'var(--green-light)' }} />
          </div>
          <strong>{data ? formatINRShort(data.kpis.thirtyDaysTotalRevenue) : '...'}</strong>
          <p>
            {data?.kpis.thirtyDaysRoomNights} nights sold • {data?.kpis.thirtyDaysAvgOccupancy}% avg occupancy
          </p>
        </motion.article>

        <motion.article
          className="metric"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div>
            <span>AVERAGE DAILY RATE (ADR) & RevPAR</span>
            <TrendingUp size={18} style={{ color: 'var(--gold)' }} />
          </div>
          <strong>{data ? money(data.kpis.adr) : '...'}</strong>
          <p>
            RevPAR: {data ? money(data.kpis.revpar) : '...'} • {data?.kpis.overallOccupancy}% Active Occupancy
          </p>
        </motion.article>
      </div>

      {/* ── Segment 1: Rooms Inventory Calculation (Cost × Occupied) ── */}
      <motion.section
        className="panel"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{ marginTop: '24px' }}
      >
        <div className="section-title" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2>
              <BedDouble size={20} style={{ color: 'var(--green-light)' }} />
              Live Room Revenue Calculation
            </h2>
            <p className="muted" style={{ marginTop: '4px', fontSize: '12px' }}>
              Direct multiplication of room night rate × occupied units across all resort categories.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="pill" style={{ background: 'rgba(26, 74, 58, 0.08)', color: 'var(--green)', fontWeight: 700 }}>
              Live Sync: {data?.kpis.occupiedRooms} / {data?.kpis.totalRooms} Rooms Occupied ({data?.kpis.overallOccupancy}%)
            </span>
          </div>
        </div>

        {/* Math equation banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(26, 74, 58, 0.05) 0%, rgba(200, 150, 74, 0.08) 100%)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, color: 'var(--green-light)' }}>CALCULATION PRINCIPLE:</span>
            <span>Room Base Price per Night <b style={{ color: 'var(--gold)' }}>×</b> Occupied Units <b style={{ color: 'var(--green)' }}>=</b> Category Daily Business</span>
          </div>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
            Daily Rooms Total: <b style={{ color: 'var(--green)', fontSize: '14px' }}>{data ? money(data.kpis.dailyRoomRevenue) : '...'}</b>
          </div>
        </div>

        {/* Detailed Room Multiplier Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data?.roomCalculations.map((room, idx) => (
            <div
              key={room.type}
              style={{
                border: '1px solid var(--line)',
                borderRadius: '12px',
                padding: '16px 20px',
                background: 'var(--cream)',
                display: 'grid',
                gridTemplateColumns: '1.6fr 1fr 1.2fr 1fr 1.2fr',
                alignItems: 'center',
                gap: '16px',
                transition: 'all var(--transition)'
              }}
              className="room-calc-row"
            >
              {/* Room Type & Tags */}
              <div>
                <b style={{ fontSize: '14px', display: 'block', color: 'var(--ink)' }}>{room.type}</b>
                <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                  Floor capacity: {room.total} keys ({room.available} available, {room.cleaning} cleaning{room.maintenance > 0 ? `, ${room.maintenance} maintenance` : ''})
                </small>
              </div>

              {/* Cost of Room */}
              <div>
                <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase' }}>Cost / Night</small>
                <b style={{ fontSize: '15px', color: 'var(--ink)' }}>{money(room.pricePerNight)}</b>
              </div>

              {/* Occupied Rooms */}
              <div>
                <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase' }}>Occupied Rooms</small>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <b style={{ fontSize: '15px', color: 'var(--green)' }}>{room.occupied}</b>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>/ {room.total} ({room.occupancyRate}%)</span>
                </div>
                {/* Mini progress bar */}
                <div style={{ height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${room.occupancyRate}%`, height: '100%', background: 'linear-gradient(90deg, var(--green), var(--green-light))', borderRadius: '2px' }} />
                </div>
              </div>

              {/* Equation symbol */}
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '11px' }}>
                <span className="pill" style={{ fontSize: '10px' }}>
                  {room.pricePerNight} × {room.occupied}
                </span>
              </div>

              {/* Subtotal Result */}
              <div style={{ textAlign: 'right' }}>
                <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase' }}>Subtotal Revenue</small>
                <b style={{ fontSize: '16px', color: 'var(--green)', display: 'block' }}>{money(room.subtotal)}</b>
                <small style={{ fontSize: '10px', color: 'var(--muted)' }}>
                  Max potential: {money(room.potentialMax)}
                </small>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Footer Bar */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--muted)' }}>
            <span>Rooms: <b style={{ color: 'var(--ink)' }}>{data ? money(data.kpis.dailyRoomRevenue) : '...'}</b></span>
            <span>+</span>
            <span>F&B Dining: <b style={{ color: 'var(--ink)' }}>{data ? money(data.kpis.dailyDiningRevenue) : '...'}</b></span>
            <span>+</span>
            <span>Spa & Ancillary: <b style={{ color: 'var(--ink)' }}>{data ? money(data.kpis.dailyServicesRevenue) : '...'}</b></span>
          </div>
          <div style={{ fontSize: '15px' }}>
            <span>Total Daily Resort Revenue: </span>
            <b style={{ color: 'var(--green)', fontSize: '18px' }}>
              {data ? money(data.kpis.dailyTotalRevenue) : '...'}
            </b>
          </div>
        </div>
      </motion.section>

      {/* ── Segment 2: Multi-Period Business Trackers (1 Day, 7 Days, 30 Days) ── */}
      <motion.section
        className="panel"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ marginTop: '24px' }}
      >
        <div className="section-title" style={{ flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2>
              <BarChart3 size={20} style={{ color: 'var(--green-light)' }} />
              Business Trackers (1-Day, 7-Days & 30-Days)
            </h2>
            <p className="muted" style={{ marginTop: '4px', fontSize: '12px' }}>
              Monitor daily operational rhythm, weekly revenue velocity, and 30-day forecast curves.
            </p>
          </div>
          <div className="tabs" style={{ margin: 0 }}>
            <button
              className={activeTab === '1day' ? 'selected' : ''}
              onClick={() => setActiveTab('1day')}
            >
              1 Day Business (Today)
            </button>
            <button
              className={activeTab === '7days' ? 'selected' : ''}
              onClick={() => setActiveTab('7days')}
            >
              7 Days Business
            </button>
            <button
              className={activeTab === '30days' ? 'selected' : ''}
              onClick={() => setActiveTab('30days')}
            >
              30 Days Business
            </button>
          </div>
        </div>

        {/* Tab 1: 1 Day Business */}
        {activeTab === '1day' && data && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
              {/* Left: Shift breakdown */}
              <div>
                <h3 style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--ink)' }}>
                  Today's Shift Revenue Generation ({data.oneDayTracker.today})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data.oneDayTracker.shifts.map((shift, i) => (
                    <div
                      key={shift.shift}
                      style={{
                        padding: '14px 16px',
                        background: 'var(--cream)',
                        borderRadius: '10px',
                        border: '1px solid var(--line)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <b style={{ fontSize: '13px', color: 'var(--ink)' }}>{shift.shift}</b>
                          <small style={{ display: 'block', color: 'var(--muted)', fontSize: '11px', marginTop: '2px' }}>
                            {shift.label}
                          </small>
                        </div>
                        <b style={{ fontSize: '14px', color: 'var(--green)' }}>{money(shift.total)}</b>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '10px', color: 'var(--muted)' }}>
                        <span>Rooms: {money(shift.rooms)}</span>
                        <span>•</span>
                        <span>F&B: {money(shift.dining)}</span>
                        <span>•</span>
                        <span>Spa: {money(shift.services)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Department split cards */}
              <div>
                <h3 style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--ink)' }}>
                  Today's Department Revenue Breakdown
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '16px', background: 'var(--cream)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span className="feature-icon sage" style={{ width: '36px', height: '36px' }}>
                          <BedDouble size={18} />
                        </span>
                        <div>
                          <b style={{ fontSize: '13px' }}>Accommodations & Rooms</b>
                          <small style={{ display: 'block', color: 'var(--muted)', fontSize: '11px' }}>
                            {data.kpis.occupiedRooms} occupied keys
                          </small>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <b style={{ fontSize: '15px', color: 'var(--green)' }}>{money(data.kpis.dailyRoomRevenue)}</b>
                        <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10px' }}>
                          {Math.round((data.kpis.dailyRoomRevenue / data.kpis.dailyTotalRevenue) * 100)}% of today
                        </small>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--cream)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span className="feature-icon peach" style={{ width: '36px', height: '36px' }}>
                          <Utensils size={18} />
                        </span>
                        <div>
                          <b style={{ fontSize: '13px' }}>Food, Beverage & In-Room Dining</b>
                          <small style={{ display: 'block', color: 'var(--muted)', fontSize: '11px' }}>
                            Live orders & restaurants
                          </small>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <b style={{ fontSize: '15px', color: 'var(--green)' }}>{money(data.kpis.dailyDiningRevenue)}</b>
                        <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10px' }}>
                          Live connected orders
                        </small>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--cream)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span className="feature-icon gold" style={{ width: '36px', height: '36px' }}>
                          <Sparkles size={18} />
                        </span>
                        <div>
                          <b style={{ fontSize: '13px' }}>Spa, Wellness & Airport Transfers</b>
                          <small style={{ display: 'block', color: 'var(--muted)', fontSize: '11px' }}>
                            Serenity Spa packages & excursions
                          </small>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <b style={{ fontSize: '15px', color: 'var(--green)' }}>{money(data.kpis.dailyServicesRevenue)}</b>
                        <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10px' }}>
                          Ancillary spend
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 2: 7 Days Business */}
        {activeTab === '7days' && data && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '14px', color: 'var(--ink)' }}>7-Day Revenue Velocity</h3>
                <small style={{ color: 'var(--muted)' }}>
                  Total 7-day revenue: <b style={{ color: 'var(--green)' }}>{formatINRShort(data.sevenDaysTracker.totalRevenue)}</b> • Total room nights: <b>{data.sevenDaysTracker.roomNights}</b>
                </small>
              </div>
              <span className="pill" style={{ background: 'rgba(200, 150, 74, 0.12)', color: 'var(--gold)' }}>
                7-Day Run Rate: {formatINRShort(data.kpis.sevenDaysAvgDaily)} / day
              </span>
            </div>

            {/* Recharts Area Chart for 7 Days */}
            <div style={{ height: '260px', width: '100%', marginBottom: '24px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.sevenDaysTracker.days} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sevenDayColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2d6b54" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2d6b54" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="day" stroke="var(--muted)" fontSize={11} />
                  <YAxis stroke="var(--muted)" fontSize={11} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip
                    formatter={(val: number) => [money(val), 'Total Revenue']}
                    labelFormatter={(label, payload) => `${payload?.[0]?.payload?.date || ''} (${label})`}
                    contentStyle={{ background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="totalRevenue" stroke="#2d6b54" strokeWidth={2.5} fill="url(#sevenDayColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Day by Day Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              {data.sevenDaysTracker.days.map((item, idx) => (
                <div
                  key={item.date}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--line)',
                    background: idx === data.sevenDaysTracker.days.length - 1 ? 'rgba(26, 74, 58, 0.06)' : 'var(--cream)',
                    textAlign: 'center'
                  }}
                >
                  <small style={{ color: 'var(--muted)', fontSize: '10px', display: 'block' }}>{item.date}</small>
                  <b style={{ fontSize: '13px', display: 'block', margin: '2px 0 6px', color: 'var(--ink)' }}>{item.day}</b>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green)', display: 'block' }}>
                    {formatINRShort(item.totalRevenue)}
                  </span>
                  <small style={{ color: 'var(--muted)', fontSize: '9px', display: 'block', marginTop: '4px' }}>
                    {item.occupiedRooms} rms ({item.occupancyPct}%)
                  </small>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tab 3: 30 Days Business */}
        {activeTab === '30days' && data && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '14px', color: 'var(--ink)' }}>30-Day Revenue Trend & Forecasting</h3>
                <small style={{ color: 'var(--muted)' }}>
                  Total 30-day projection: <b style={{ color: 'var(--green)' }}>{formatINRShort(data.thirtyDaysTracker.totalRevenue)}</b> • Avg occupancy: <b>{data.kpis.thirtyDaysAvgOccupancy}%</b>
                </small>
              </div>
              <span className="pill" style={{ background: 'rgba(26, 74, 58, 0.1)', color: 'var(--green)' }}>
                Monthly Run Rate: {formatINRShort(data.thirtyDaysTracker.totalRevenue)}
              </span>
            </div>

            {/* 4-Week summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              {data.thirtyDaysTracker.weeklySummary.map(w => (
                <div key={w.week} style={{ padding: '14px', background: 'var(--cream)', borderRadius: '10px', border: '1px solid var(--line)' }}>
                  <small style={{ color: 'var(--muted)', fontSize: '11px', display: 'block' }}>{w.week}</small>
                  <b style={{ fontSize: '16px', color: 'var(--ink)', display: 'block', margin: '4px 0' }}>
                    {formatINRShort(w.revenue)}
                  </b>
                  <small style={{ color: 'var(--green-light)', fontSize: '10px', fontWeight: 600 }}>
                    Avg Occupancy: {w.avgOcc}%
                  </small>
                </div>
              ))}
            </div>

            {/* 30-day curve chart */}
            <div style={{ height: '240px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.thirtyDaysTracker.days} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="thirtyDayColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c8964a" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#c8964a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="date" stroke="var(--muted)" fontSize={10} interval={4} />
                  <YAxis stroke="var(--muted)" fontSize={10} tickFormatter={v => `₹${v}L`} />
                  <Tooltip
                    formatter={(val: number) => [`₹${val} Lakhs`, 'Day Total']}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="revenueLakhs" stroke="#c8964a" strokeWidth={2} fill="url(#thirtyDayColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </motion.section>

      {/* ── Segment 3: Interactive Business Calculator & Scenario Storage ── */}
      <motion.section
        id="revenue-calculator"
        className="panel"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{ marginTop: '24px' }}
      >
        <div className="section-title" style={{ flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2>
              <Calculator size={20} style={{ color: 'var(--gold)' }} />
              Business Revenue Simulator & Calculator
            </h2>
            <p className="muted" style={{ marginTop: '4px', fontSize: '12px' }}>
              Simulate occupancy, room category price adjustments, and calculate 1-day, 7-day & 30-day business outcomes.
            </p>
          </div>
          <motion.button
            className="primary"
            onClick={() => setShowSaveModal(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Save size={15} />
            <span>Save Simulation to Database</span>
          </motion.button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '28px', alignItems: 'flex-start' }}>
          {/* Controls: Target Occupancy Slider & Room Rates */}
          <div>
            {/* Occupancy Slider */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ margin: 0, fontSize: '13px' }}>Target Resort Occupancy Rate</label>
                <b style={{ color: 'var(--green)', fontSize: '15px' }}>{simOccupancy}% ({simulation.simOccupiedRooms} of {data?.kpis.totalRooms || 150} rooms)</b>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                value={simOccupancy}
                onChange={e => setSimOccupancy(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                <span>30% Low Season</span>
                <span>65% Shoulder</span>
                <span>85% Current Target</span>
                <span>100% Sold Out Peak</span>
              </div>
            </div>

            {/* Dining per guest slider */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ margin: 0, fontSize: '13px' }}>Estimated F&B / Dining Spend per Guest</label>
                <b style={{ color: 'var(--gold)', fontSize: '14px' }}>₹{simDiningSpend} / guest / day</b>
              </div>
              <input
                type="range"
                min="500"
                max="5000"
                step="100"
                value={simDiningSpend}
                onChange={e => setSimDiningSpend(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Room Rate Inputs Grid */}
            <label style={{ fontSize: '13px', marginBottom: '10px' }}>Custom Room Rates by Category (₹ / night)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {data?.roomCalculations.map(r => (
                <div key={r.type} style={{ padding: '10px 14px', background: 'var(--cream)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10px', fontWeight: 600 }}>{r.type}</small>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--muted)' }}>₹</span>
                    <input
                      type="number"
                      value={simRates[r.type] !== undefined ? simRates[r.type] : r.pricePerNight}
                      onChange={e => setSimRates({ ...simRates, [r.type]: Number(e.target.value) })}
                      style={{ padding: '6px 10px', fontSize: '13px', fontWeight: 700 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Calculation Results Box */}
          <div
            style={{
              padding: '24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(26, 74, 58, 0.08) 0%, rgba(200, 150, 74, 0.12) 100%)',
              border: '1px solid rgba(26, 74, 58, 0.2)'
            }}
          >
            <span className="eyebrow" style={{ color: 'var(--green-light)', marginBottom: '8px' }}>
              SIMULATED REVENUE PROJECTION
            </span>
            <h3 style={{ fontSize: '18px', color: 'var(--ink)', marginBottom: '16px' }}>
              Calculated Business Output
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>1-Day Business (Projected):</span>
                <b style={{ fontSize: '16px', color: 'var(--green)' }}>{formatINRShort(simulation.daily)}</b>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>7-Days Business (Projected):</span>
                <b style={{ fontSize: '16px', color: 'var(--green)' }}>{formatINRShort(simulation.weekly)}</b>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>30-Days Business (Projected):</span>
                <b style={{ fontSize: '17px', color: 'var(--gold)' }}>{formatINRShort(simulation.monthly)}</b>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Variance vs Live Today:</span>
                <span className={`pill ${simulation.variance >= 0 ? 'rate-up' : 'rate-down'}`} style={{ fontWeight: 700 }}>
                  {simulation.variance >= 0 ? '+' : ''}{simulation.variance}%
                </span>
              </div>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px dashed var(--line)', fontSize: '11px', color: 'var(--muted)', lineHeight: '1.6' }}>
              Simulates {simulation.simOccupiedRooms} occupied rooms with your custom category rates plus estimated dining of ₹{simDiningSpend}/guest.
            </div>
          </div>
        </div>

        {/* ── Saved Calculations List ── */}
        <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: '1px solid var(--line)' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--ink)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookmarkCheck size={18} style={{ color: 'var(--green-light)' }} />
            Stored Business Calculations in Database ({data?.savedCalculations.length || 0})
          </h3>

          {data?.savedCalculations && data.savedCalculations.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {data.savedCalculations.map(calc => (
                <div
                  key={calc.id}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '12px',
                    border: '1px solid var(--line)',
                    background: 'var(--cream)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all var(--transition)'
                  }}
                  className="saved-calc-card"
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <b style={{ fontSize: '14px', color: 'var(--ink)' }}>{calc.title}</b>
                      <button
                        className="icon-btn"
                        style={{ padding: '4px', color: '#ef4444' }}
                        title="Delete scenario"
                        onClick={() => handleDeleteCalculation(calc.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <small style={{ color: 'var(--muted)', fontSize: '10px', display: 'block', marginTop: '4px' }}>
                      Target: {calc.calculation_data.targetOccupancy || 85}% occupancy • Saved on {new Date(calc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </small>
                    {calc.calculation_data.notes && (
                      <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px', fontStyle: 'italic' }}>
                        "{calc.calculation_data.notes}"
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px dashed var(--line)' }}>
                    <div>
                      <small style={{ fontSize: '9px', color: 'var(--muted)', display: 'block' }}>1-Day Business</small>
                      <b style={{ fontSize: '13px', color: 'var(--green)' }}>{formatINRShort(calc.daily_revenue)}</b>
                    </div>
                    <div>
                      <small style={{ fontSize: '9px', color: 'var(--muted)', display: 'block' }}>30-Days Business</small>
                      <b style={{ fontSize: '13px', color: 'var(--gold)' }}>{formatINRShort(calc.monthly_revenue)}</b>
                    </div>
                    <motion.button
                      className="secondary"
                      style={{ padding: '6px 12px', fontSize: '11px' }}
                      onClick={() => handleLoadCalculation(calc)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Load
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="loading-copy">No stored calculations yet. Use the simulator above to save your first business scenario.</p>
          )}
        </div>
      </motion.section>

      {/* ── Save Calculation Modal Dialog ────────────────────────── */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
            <motion.div
              className="modal-content"
              style={{ maxWidth: '520px' }}
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="guest-modal-header">
                <div>
                  <h3 style={{ fontSize: '16px', margin: 0 }}>Save Business Scenario</h3>
                  <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                    Persists rates, occupancy targets & projections to resort database
                  </small>
                </div>
                <button className="icon-btn" onClick={() => setShowSaveModal(false)}>✕</button>
              </div>

              <form onSubmit={handleSaveCalculation} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label htmlFor="scenario-title">Scenario Name / Strategy Title *</label>
                  <input
                    id="scenario-title"
                    required
                    placeholder="e.g. Christmas Peak 96% Surge Strategy"
                    value={scenarioTitle}
                    onChange={e => setScenarioTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="scenario-notes">Strategic Notes or Assumptions</label>
                  <textarea
                    id="scenario-notes"
                    rows={3}
                    placeholder="e.g. Higher rates for villas, bundled gala dinner credits..."
                    value={scenarioNotes}
                    onChange={e => setScenarioNotes(e.target.value)}
                  />
                </div>

                <div style={{ background: 'var(--cream)', padding: '12px', borderRadius: '8px', fontSize: '11px', color: 'var(--muted)' }}>
                  <div><b>1-Day Projection:</b> {formatINRShort(simulation.daily)}</div>
                  <div><b>7-Days Projection:</b> {formatINRShort(simulation.weekly)}</div>
                  <div><b>30-Days Projection:</b> {formatINRShort(simulation.monthly)}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="secondary" onClick={() => setShowSaveModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary" disabled={busy || !scenarioTitle.trim()}>
                    {busy ? 'Saving...' : 'Save to Database'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
