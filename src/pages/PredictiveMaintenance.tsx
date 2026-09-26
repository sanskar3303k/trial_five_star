import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingDown,
  Activity,
  Settings,
  Zap,
  Thermometer,
  Droplets,
  Calendar,
  ArrowRight,
  X,
  Check,
  Plus,
  RefreshCw,
  UserCheck,
  Sparkles
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '../services/api';

export interface Equipment {
  id: string;
  name: string;
  location: string;
  type: string;
  status: string;
  health: number;
  last_maintenance?: string;
  lastMaintenance?: string;
  next_due?: string;
  nextDue?: string;
  failure_probability?: number;
  failureProbability?: number;
  issue: string | null;
  estimated_cost?: string | null;
  estimatedCost?: string | null;
}

export interface MaintenanceTask {
  id: string;
  equipment_id?: string;
  equipment_name?: string;
  equipment?: string;
  task: string;
  priority: string;
  technician?: string;
  scheduled_date?: string;
  scheduled?: string;
  duration: string;
  status?: string;
  estimated_cost?: string;
  notes?: string;
}

export interface MaintenanceOverview {
  equipment: Equipment[];
  tasks: MaintenanceTask[];
  healthDistribution: { name: string; value: number; count: number; color: string }[];
  maintenanceHistory: { month: string; scheduled: number; emergency: number; cost: number }[];
  sensorReadings: { time: string; vibration: number; temperature: number; pressure: number }[];
  criticalCount: number;
  scheduledCount: number;
  overallHealthPct: number;
}

const fallbackEquipment: Equipment[] = [
  {
    id: 'eq-1',
    name: 'Main Pool Pump',
    location: 'Pool Area',
    type: 'Pump',
    status: 'Critical',
    health: 23,
    last_maintenance: '2026-08-15',
    next_due: '2026-09-28',
    failure_probability: 78,
    issue: 'Vibration levels critical - bearing wear detected',
    estimated_cost: '₹1.85L'
  },
  {
    id: 'eq-2',
    name: 'HVAC Unit - Block A',
    location: 'Block A Rooftop',
    type: 'HVAC',
    status: 'Warning',
    health: 58,
    last_maintenance: '2026-08-20',
    next_due: '2026-10-05',
    failure_probability: 42,
    issue: 'Filter replacement needed, efficiency dropping',
    estimated_cost: '₹45K'
  },
  {
    id: 'eq-3',
    name: 'Generator #2',
    location: 'Power Room',
    type: 'Generator',
    status: 'Healthy',
    health: 92,
    last_maintenance: '2026-09-01',
    next_due: '2026-12-01',
    failure_probability: 8,
    issue: null,
    estimated_cost: null
  },
  {
    id: 'eq-4',
    name: 'Water Treatment Plant',
    location: 'Utility Area',
    type: 'Treatment',
    status: 'Warning',
    health: 67,
    last_maintenance: '2026-08-25',
    next_due: '2026-10-10',
    failure_probability: 35,
    issue: 'Chemical balance sensors need calibration',
    estimated_cost: '₹28K'
  },
  {
    id: 'eq-5',
    name: 'Elevator - Building C',
    location: 'Building C',
    type: 'Elevator',
    status: 'Healthy',
    health: 95,
    last_maintenance: '2026-09-10',
    next_due: '2026-11-10',
    failure_probability: 5,
    issue: null,
    estimated_cost: null
  },
  {
    id: 'eq-6',
    name: 'Kitchen Exhaust System',
    location: 'Main Kitchen',
    type: 'Ventilation',
    status: 'Critical',
    health: 34,
    last_maintenance: '2026-08-10',
    next_due: '2026-09-27',
    failure_probability: 85,
    issue: 'Duct buildup exceeds safe levels - fire hazard',
    estimated_cost: '₹92K'
  },
];

const fallbackTasks: MaintenanceTask[] = [
  { id: 'task-1', equipment_name: 'Pool Pump', task: 'Bearing Replacement', priority: 'Critical', scheduled_date: 'Today 2:00 PM', duration: '4 hours', technician: 'Apex ElectroMech' },
  { id: 'task-2', equipment_name: 'Kitchen Exhaust', task: 'Deep Cleaning', priority: 'Critical', scheduled_date: 'Tomorrow 9:00 AM', duration: '3 hours', technician: 'SafeFire Services' },
  { id: 'task-3', equipment_name: 'HVAC Unit A', task: 'Filter Replacement', priority: 'Medium', scheduled_date: '28 Sept 2026', duration: '1 hour', technician: 'Internal Team' },
  { id: 'task-4', equipment_name: 'Water Treatment', task: 'Sensor Calibration', priority: 'Low', scheduled_date: '30 Sept 2026', duration: '2 hours', technician: 'AquaPure' },
];

export default function PredictiveMaintenance() {
  const [data, setData] = useState<MaintenanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  // Modals state
  const [repairTarget, setRepairTarget] = useState<Equipment | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Equipment | null>(null);
  const [rescheduleTask, setRescheduleTask] = useState<MaintenanceTask | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Schedule repair form state
  const [repairForm, setRepairForm] = useState({
    task: '',
    priority: 'Critical',
    technician: 'Emergency Engineering Team',
    scheduledDate: 'Tomorrow 9:00 AM',
    duration: '3 hours',
    estimatedCost: '₹1.85L',
    notes: ''
  });

  // Reschedule form state
  const [newScheduleDate, setNewScheduleDate] = useState('');

  // Add equipment form state
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    location: '',
    type: 'HVAC',
    health: 85,
    status: 'Healthy',
    failureProbability: 15,
    estimatedCost: '₹30K'
  });

  const fetchData = async () => {
    try {
      const res = await api<MaintenanceOverview>('/maintenance/overview');
      setData(res);
    } catch {
      // Fallback local initial state if offline
      setData({
        equipment: fallbackEquipment,
        tasks: fallbackTasks,
        healthDistribution: [
          { name: 'Healthy', value: 65, count: 2, color: '#10b981' },
          { name: 'Warning', value: 25, count: 2, color: '#f59e0b' },
          { name: 'Critical', value: 10, count: 2, color: '#ef4444' },
        ],
        maintenanceHistory: [
          { month: 'Aug', scheduled: 12, emergency: 3, cost: 2.4 },
          { month: 'Sep', scheduled: 15, emergency: 2, cost: 1.8 },
          { month: 'Oct', scheduled: 10, emergency: 5, cost: 3.2 },
          { month: 'Nov', scheduled: 14, emergency: 1, cost: 1.5 },
          { month: 'Dec', scheduled: 11, emergency: 4, cost: 2.8 },
          { month: 'Jan', scheduled: 16, emergency: 2, cost: 1.9 },
        ],
        sensorReadings: [
          { time: '00:00', vibration: 2.1, temperature: 45, pressure: 12 },
          { time: '04:00', vibration: 2.3, temperature: 47, pressure: 13 },
          { time: '08:00', vibration: 2.8, temperature: 52, pressure: 15 },
          { time: '12:00', vibration: 3.5, temperature: 58, pressure: 18 },
          { time: '16:00', vibration: 4.2, temperature: 65, pressure: 22 },
          { time: '20:00', vibration: 4.8, temperature: 68, pressure: 24 },
        ],
        criticalCount: 2,
        scheduledCount: 4,
        overallHealthPct: 78
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openScheduleModal = (equipment: Equipment) => {
    setRepairTarget(equipment);
    setRepairForm({
      task: equipment.name.includes('Pump') ? 'Bearing Replacement & Vibration Alignment'
        : equipment.name.includes('Exhaust') ? 'Deep Duct Degreasing & Filter Replacement'
        : equipment.name.includes('HVAC') ? 'Compressor Servicing & Coil Clean'
        : `${equipment.name} Overhaul`,
      priority: equipment.status === 'Critical' ? 'Critical' : 'High',
      technician: equipment.type === 'Pump' ? 'Apex ElectroMech Services'
        : equipment.type === 'Ventilation' ? 'SafeFire Duct Systems'
        : 'In-House Senior Engineering',
      scheduledDate: 'Tomorrow 9:00 AM',
      duration: '3 hours',
      estimatedCost: equipment.estimated_cost || equipment.estimatedCost || '₹1.2L',
      notes: equipment.issue || 'Preventative component overhaul to avert breakdown.'
    });
  };

  const handleConfirmSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repairTarget) return;

    setBusy(true);
    setError('');
    try {
      const res = await api<{ ok: boolean; message: string }>('/maintenance/schedule', 'POST', {
        equipmentId: repairTarget.id,
        task: repairForm.task,
        priority: repairForm.priority,
        technician: repairForm.technician,
        scheduledDate: repairForm.scheduledDate,
        duration: repairForm.duration,
        estimatedCost: repairForm.estimatedCost,
        notes: repairForm.notes
      });
      setToast(res.message || `Repair scheduled successfully for ${repairTarget.name}!`);
      setRepairTarget(null);
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTask || !newScheduleDate) return;

    setBusy(true);
    try {
      await api(`/maintenance/tasks/${rescheduleTask.id}`, 'PATCH', {
        scheduled_date: newScheduleDate
      });
      setToast(`Task "${rescheduleTask.task}" rescheduled to ${newScheduleDate}.`);
      setRescheduleTask(null);
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipment.name) return;

    setBusy(true);
    try {
      await api('/maintenance/equipment', 'POST', newEquipment);
      setToast(`Equipment "${newEquipment.name}" added successfully.`);
      setShowAddModal(false);
      setNewEquipment({ name: '', location: '', type: 'HVAC', health: 85, status: 'Healthy', failureProbability: 15, estimatedCost: '₹30K' });
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'Warning': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Repair Scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Healthy': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 80) return 'text-green-600';
    if (health >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const currentEquipment = data?.equipment || fallbackEquipment;
  const currentTasks = data?.tasks || fallbackTasks;
  const criticalItems = currentEquipment.filter(e => e.status === 'Critical');
  const criticalCount = data ? data.criticalCount : criticalItems.length;
  const scheduledCount = data ? data.scheduledCount : currentTasks.length;
  const healthDistribution = data?.healthDistribution || [
    { name: 'Healthy', value: 65, color: '#10b981' },
    { name: 'Warning', value: 25, color: '#f59e0b' },
    { name: 'Critical', value: 10, color: '#ef4444' },
  ];
  const maintenanceHistory = data?.maintenanceHistory || [
    { month: 'Aug', scheduled: 12, emergency: 3, cost: 2.4 },
    { month: 'Sep', scheduled: 15, emergency: 2, cost: 1.8 },
    { month: 'Oct', scheduled: 10, emergency: 5, cost: 3.2 },
    { month: 'Nov', scheduled: 14, emergency: 1, cost: 1.5 },
    { month: 'Dec', scheduled: 11, emergency: 4, cost: 2.8 },
    { month: 'Jan', scheduled: 16, emergency: 2, cost: 1.9 },
  ];
  const sensorReadings = data?.sensorReadings || [
    { time: '00:00', vibration: 2.1, temperature: 45, pressure: 12 },
    { time: '04:00', vibration: 2.3, temperature: 47, pressure: 13 },
    { time: '08:00', vibration: 2.8, temperature: 52, pressure: 15 },
    { time: '12:00', vibration: 3.5, temperature: 58, pressure: 18 },
    { time: '16:00', vibration: 4.2, temperature: 65, pressure: 22 },
    { time: '20:00', vibration: 4.8, temperature: 68, pressure: 24 },
  ];

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Toast Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="success"
            role="status"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={18} />
              <span>{toast}</span>
            </div>
            <button className="icon-btn" onClick={() => setToast('')} style={{ color: 'inherit' }}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div className="error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {error}
        </motion.div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-50 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Critical Alerts</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{criticalCount}</div>
          <div className="text-sm text-red-600 mt-1 font-medium">
            {criticalCount > 0 ? 'Requires immediate action' : 'All systems stabilized'}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-50 rounded-xl">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Scheduled Work Orders</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{scheduledCount}</div>
          <div className="text-sm text-slate-500 mt-1">Active tasks scheduled</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-50 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Average Equipment Health</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{data?.overallHealthPct || 78}%</div>
          <div className="text-sm text-green-600 mt-1 font-medium">+8% following predictive intervention</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-50 rounded-xl">
              <TrendingDown className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Downtime Reduction</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">42%</div>
          <div className="text-sm text-green-600 mt-1 font-medium">Gemini ML predictive model</div>
        </div>
      </div>

      {/* Critical Alerts Banner with Interactive Repair Buttons */}
      {criticalItems.length > 0 ? (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 border border-red-200 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-xl flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-slate-900">Critical Equipment Requiring Immediate Attention</h3>
                <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                  {criticalItems.length} Urgent Items
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {criticalItems.map(equipment => {
                  const failureRisk = equipment.failure_probability || equipment.failureProbability || 75;
                  const estCost = equipment.estimated_cost || equipment.estimatedCost || '₹1.0L';

                  return (
                    <motion.div
                      key={equipment.id}
                      className="bg-white rounded-xl p-4 border border-red-100 shadow-sm hover:shadow-md transition-shadow"
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900">{equipment.name}</span>
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-100">
                          {failureRisk}% failure risk
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">{equipment.issue}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">Est. Cost: <b>{estCost}</b></span>
                        <button
                          className="schedule-repair-btn text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                          onClick={() => openScheduleModal(equipment)}
                        >
                          Schedule Repair <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">All Critical Equipment Repairs Have Been Scheduled</h3>
              <p className="text-sm text-slate-600">Work orders dispatched. Vibration, thermal, and sensor readings within managed thresholds.</p>
            </div>
          </div>
          <button
            className="secondary"
            onClick={fetchData}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} /> Refresh Diagnostics
          </button>
        </div>
      )}

      {/* Equipment Health Overview and Cost Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Equipment Health Distribution</h3>
          <p className="text-sm text-slate-500 mb-4">Overall live status breakdown</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={healthDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {healthDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}% of total systems`, 'Health Status']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {healthDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-slate-600">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Maintenance Cost Trend</h3>
              <p className="text-sm text-slate-500">Monthly breakdown in lakhs (INR)</p>
            </div>
            <span className="pill text-xs">Live Logged Costs</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={maintenanceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} unit="L" />
              <Tooltip formatter={(val: number) => [`₹${val} Lakhs`, 'Monthly Spend']} />
              <Line type="monotone" dataKey="cost" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sensor Readings - Pool Pump */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Live Sensor Monitoring &bull; Main Pool Pump</h3>
            <p className="text-sm text-slate-600">Telemetry streams from IoT acoustic, vibration, and thermal probes</p>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-500 animate-pulse" />
            <span className="text-sm font-semibold text-red-600">
              {criticalCount > 0 ? 'Anomalies Detected (Bearing)' : 'Operating Normally'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-slate-500 font-medium">Vibration Speed</span>
            </div>
            <div className="text-2xl font-bold text-red-600">4.8 mm/s</div>
            <div className="text-xs text-red-600 mt-1 font-medium">Threshold: 3.0 mm/s (Bearing friction)</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="w-5 h-5 text-red-500" />
              <span className="text-sm text-slate-500 font-medium">Casing Temperature</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">68°C</div>
            <div className="text-xs text-orange-600 mt-1 font-medium">Threshold: 70°C (Warning zone)</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-slate-500 font-medium">Line Hydraulic Pressure</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">24 PSI</div>
            <div className="text-xs text-green-600 mt-1 font-medium">Normal pressure range</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={sensorReadings}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="vibration" name="Vibration (mm/s)" stroke="#f97316" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#ef4444" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Equipment List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">All Monitored Equipment</h3>
            <p className="text-sm text-slate-500">Continuous telemetry and predictive health index</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="secondary flex items-center gap-1.5"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw size={15} /> Refresh Status
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm font-semibold shadow-sm"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4" />
              <span>Add Equipment</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipment</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Health</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Failure Risk</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Next Due</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentEquipment.map((equipment) => {
                const failureRisk = equipment.failure_probability || equipment.failureProbability || 0;
                const nextDate = equipment.next_due || equipment.nextDue || '2026-10-15';

                return (
                  <tr key={equipment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-slate-900">{equipment.name}</div>
                        <div className="text-sm text-slate-500">{equipment.type}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{equipment.location}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              equipment.health >= 80 ? 'bg-green-500' :
                              equipment.health >= 50 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${equipment.health}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-semibold ${getHealthColor(equipment.health)}`}>
                          {equipment.health}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(equipment.status)}`}>
                        {equipment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-semibold ${
                        failureRisk >= 50 ? 'text-red-600' :
                        failureRisk >= 25 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {failureRisk}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        {nextDate}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          className="text-emerald-700 hover:text-emerald-800 text-sm font-semibold hover:underline"
                          onClick={() => setDetailsTarget(equipment)}
                        >
                          View Details
                        </button>
                        {equipment.status !== 'Healthy' && (
                          <button
                            className="text-xs bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-semibold px-2.5 py-1 rounded-md transition-colors"
                            onClick={() => openScheduleModal(equipment)}
                          >
                            Schedule Repair
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Maintenance Schedule */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Upcoming Maintenance Work Orders</h3>
            <p className="text-sm text-slate-500">Scheduled repairs, technician dispatches, and compliance overhauls</p>
          </div>
          <span className="pill">{currentTasks.length} Work Orders</span>
        </div>

        <div className="space-y-3">
          {currentTasks.map((task) => {
            const taskEquip = task.equipment_name || task.equipment || 'Equipment';
            const scheduledTime = task.scheduled_date || task.scheduled || 'Scheduled';

            return (
              <div key={task.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/70 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-1.5 h-12 rounded-full ${
                    task.priority === 'Critical' ? 'bg-red-500' :
                    task.priority === 'Medium' || task.priority === 'High' ? 'bg-orange-500' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <div className="font-semibold text-slate-900">{taskEquip} &bull; {task.task}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                      <Clock size={13} />
                      <span>{scheduledTime} &bull; Est. Duration: {task.duration}</span>
                      {task.technician && <span className="text-slate-700 font-medium">&bull; Tech: {task.technician}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    task.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                    task.priority === 'Medium' || task.priority === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {task.priority}
                  </span>
                  <button
                    className="text-sm font-semibold text-purple-700 hover:text-purple-800 hover:underline px-2 py-1"
                    onClick={() => { setRescheduleTask(task); setNewScheduleDate(scheduledTime); }}
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SCHEDULE REPAIR MODAL */}
      <AnimatePresence>
        {repairTarget && (
          <div className="modal-overlay" onClick={() => setRepairTarget(null)}>
            <motion.div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ maxWidth: '580px' }}
            >
              <div className="guest-modal-header">
                <div>
                  <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wrench className="text-red-600" size={20} />
                    Schedule Predictive Repair
                  </h2>
                  <p className="muted">Create work order & dispatch technical repair team</p>
                </div>
                <button className="icon-btn close-modal-btn" onClick={() => setRepairTarget(null)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleConfirmSchedule} className="p-6 space-y-4">
                {/* Equipment summary card */}
                <div className="bg-red-50/70 border border-red-100 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <b className="text-slate-900 block">{repairTarget.name}</b>
                    <small className="text-slate-600">{repairTarget.location} &bull; {repairTarget.type}</small>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded border border-red-200">
                      {repairTarget.failure_probability || repairTarget.failureProbability || 75}% Risk
                    </span>
                    <small className="text-slate-500 block mt-1">Est. {repairTarget.estimated_cost || repairTarget.estimatedCost || '₹1.5L'}</small>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Work Order Task Title</label>
                  <input
                    type="text"
                    required
                    value={repairForm.task}
                    onChange={e => setRepairForm({ ...repairForm, task: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Level</label>
                    <select
                      value={repairForm.priority}
                      onChange={e => setRepairForm({ ...repairForm, priority: e.target.value })}
                    >
                      <option value="Critical">Critical (Immediate)</option>
                      <option value="High">High (Within 24h)</option>
                      <option value="Medium">Medium (Scheduled)</option>
                      <option value="Low">Low (Routine)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Vendor / Tech</label>
                    <input
                      type="text"
                      required
                      value={repairForm.technician}
                      onChange={e => setRepairForm({ ...repairForm, technician: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Date & Time</label>
                    <input
                      type="text"
                      required
                      value={repairForm.scheduledDate}
                      onChange={e => setRepairForm({ ...repairForm, scheduledDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Est. Repair Cost</label>
                    <input
                      type="text"
                      value={repairForm.estimatedCost}
                      onChange={e => setRepairForm({ ...repairForm, estimatedCost: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Special Instructions & Safety Notes</label>
                  <textarea
                    rows={2}
                    value={repairForm.notes}
                    onChange={e => setRepairForm({ ...repairForm, notes: e.target.value })}
                    placeholder="Enter lock-out tag-out instructions or replacement part numbers..."
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button type="button" className="secondary" onClick={() => setRepairTarget(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary" disabled={busy} style={{ background: '#be123c' }}>
                    {busy ? 'Dispatching...' : 'Confirm & Dispatch Work Order'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESCHEDULE WORK ORDER MODAL */}
      <AnimatePresence>
        {rescheduleTask && (
          <div className="modal-overlay" onClick={() => setRescheduleTask(null)}>
            <motion.div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ maxWidth: '460px' }}
            >
              <div className="guest-modal-header">
                <div>
                  <h2 style={{ fontSize: '17px' }}>Reschedule Maintenance Task</h2>
                  <p className="muted">{rescheduleTask.task}</p>
                </div>
                <button className="icon-btn close-modal-btn" onClick={() => setRescheduleTask(null)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmReschedule} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Date/Time</label>
                  <p className="text-sm font-medium text-slate-700 bg-slate-100 p-2.5 rounded-lg">
                    {rescheduleTask.scheduled_date || rescheduleTask.scheduled}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Scheduled Slot</label>
                  <input
                    type="text"
                    required
                    value={newScheduleDate}
                    onChange={e => setNewScheduleDate(e.target.value)}
                    placeholder="e.g. 29 Sept 2026, 11:00 AM"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button type="button" className="secondary" onClick={() => setRescheduleTask(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary" disabled={busy}>
                    {busy ? 'Updating...' : 'Save Reschedule'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EQUIPMENT DETAILS MODAL */}
      <AnimatePresence>
        {detailsTarget && (
          <div className="modal-overlay" onClick={() => setDetailsTarget(null)}>
            <motion.div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ maxWidth: '520px' }}
            >
              <div className="guest-modal-header">
                <div>
                  <h2 style={{ fontSize: '18px' }}>{detailsTarget.name}</h2>
                  <p className="muted">{detailsTarget.location} &bull; {detailsTarget.type}</p>
                </div>
                <button className="icon-btn close-modal-btn" onClick={() => setDetailsTarget(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl">
                  <div>
                    <small className="text-slate-500 block">Health Rating</small>
                    <b className={`text-xl ${getHealthColor(detailsTarget.health)}`}>{detailsTarget.health}%</b>
                  </div>
                  <div>
                    <small className="text-slate-500 block">Operating Status</small>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusStyle(detailsTarget.status)}`}>
                      {detailsTarget.status}
                    </span>
                  </div>
                  <div>
                    <small className="text-slate-500 block">Last Maintenance</small>
                    <b>{detailsTarget.last_maintenance || detailsTarget.lastMaintenance || '2026-08-15'}</b>
                  </div>
                  <div>
                    <small className="text-slate-500 block">Next Overhaul Due</small>
                    <b>{detailsTarget.next_due || detailsTarget.nextDue || '2026-10-15'}</b>
                  </div>
                </div>

                {detailsTarget.issue && (
                  <div className="bg-red-50 p-3.5 rounded-xl border border-red-100">
                    <small className="text-red-700 font-bold block mb-1">Diagnostic Issue Flagged:</small>
                    <p className="text-sm text-red-900">{detailsTarget.issue}</p>
                    <small className="text-slate-500 block mt-2">Est. repair cost: {detailsTarget.estimated_cost || detailsTarget.estimatedCost || 'N/A'}</small>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button className="secondary" onClick={() => setDetailsTarget(null)}>
                    Close
                  </button>
                  {detailsTarget.status !== 'Healthy' && (
                    <button
                      className="primary"
                      onClick={() => {
                        const target = detailsTarget;
                        setDetailsTarget(null);
                        openScheduleModal(target);
                      }}
                    >
                      Schedule Repair Now
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD EQUIPMENT MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <motion.div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ maxWidth: '500px' }}
            >
              <div className="guest-modal-header">
                <div>
                  <h2 style={{ fontSize: '18px' }}>Add Resort Equipment</h2>
                  <p className="muted">Register hardware into Gemini predictive maintenance pipeline</p>
                </div>
                <button className="icon-btn close-modal-btn" onClick={() => setShowAddModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddEquipment} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Equipment Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chiller Unit #3"
                    value={newEquipment.name}
                    onChange={e => setNewEquipment({ ...newEquipment, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. North Wing Basement"
                      value={newEquipment.location}
                      onChange={e => setNewEquipment({ ...newEquipment, location: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Equipment Type</label>
                    <select
                      value={newEquipment.type}
                      onChange={e => setNewEquipment({ ...newEquipment, type: e.target.value })}
                    >
                      <option value="HVAC">HVAC</option>
                      <option value="Pump">Pump / Hydraulic</option>
                      <option value="Generator">Generator</option>
                      <option value="Elevator">Elevator</option>
                      <option value="Ventilation">Ventilation</option>
                      <option value="Treatment">Water Treatment</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button type="button" className="secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary" disabled={busy}>
                    {busy ? 'Saving...' : 'Register Equipment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
