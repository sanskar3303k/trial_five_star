import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Coffee,
  Sun,
  Moon,
  UserPlus,
  Filter,
  Check,
  X,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Award,
  Calendar,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { api } from '../services/api';

export interface StaffMember {
  id: number;
  name: string;
  role: string;
  department: string;
  status: string;
  shift: string;
  hours: number;
  efficiency: number;
  avatar: string;
  phone?: string;
  email?: string;
  experience_years?: number;
  assigned_area?: string;
  created_at?: string;
}

export interface StaffRecommendation {
  id: number;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  impact: string;
  action: string;
  status: string;
}

export interface StaffData {
  metrics: {
    totalStaff: number;
    onShift: number;
    avgEfficiency: number;
    hoursToday: number;
    activeWorkforcePct: number;
  };
  recommendations: StaffRecommendation[];
  workloadData: { department: string; current: number; optimal: number; staff: number }[];
  efficiencyTrend: { day: string; efficiency: number }[];
  shiftSchedule: { time: string; label: string; staff: number; color: string }[];
  staffMembers: StaffMember[];
}

export default function StaffScheduling() {
  const [data, setData] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  // Modals state
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form for adding staff
  const [newStaff, setNewStaff] = useState({
    name: '',
    role: '',
    department: 'Housekeeping',
    shift: 'Morning',
    hours: 8,
    phone: '',
    email: '',
    assigned_area: ''
  });

  const fetchStaffData = async () => {
    try {
      const res = await api<StaffData>('/staff');
      setData(res);
    } catch (err: any) {
      console.error('Failed to load staff data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const handleRecommendationAction = async (rec: StaffRecommendation) => {
    setBusy(true);
    try {
      const res = await api<{ ok: boolean; message: string }>(`/staff/recommendations/${rec.id}/action`, 'POST');
      setToast(res.message || 'Action executed successfully!');
      await fetchStaffData();
    } catch (err: any) {
      setToast(err.message || 'Failed to execute recommendation.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name.trim() || !newStaff.role.trim()) {
      setToast('Please enter employee name and role.');
      return;
    }

    setBusy(true);
    try {
      await api('/staff', 'POST', newStaff);
      setToast(`New staff member ${newStaff.name} onboarded successfully!`);
      setShowAddModal(false);
      setNewStaff({
        name: '',
        role: '',
        department: 'Housekeeping',
        shift: 'Morning',
        hours: 8,
        phone: '',
        email: '',
        assigned_area: ''
      });
      await fetchStaffData();
    } catch (err: any) {
      setToast(err.message || 'Failed to add staff member.');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateStaffStatus = async (id: number, status: string, shift?: string) => {
    setBusy(true);
    try {
      const res = await api<{ ok: boolean; staff: StaffMember }>(`/staff/${id}`, 'PUT', { status, shift });
      setSelectedStaff(res.staff);
      setToast(`Status updated to "${status}" for ${res.staff.name}`);
      await fetchStaffData();
    } catch (err: any) {
      setToast(err.message || 'Failed to update staff status.');
    } finally {
      setBusy(false);
    }
  };

  const staffList = data?.staffMembers || [];
  const filteredStaff = staffList.filter(staff => {
    if (selectedDepartment !== 'all' && staff.department !== selectedDepartment) return false;
    if (selectedShift !== 'all' && staff.shift !== selectedShift) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On Shift': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'On Break': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Off Duty': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRecommendationStyle = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-200 bg-red-50/70';
      case 'warning': return 'border-amber-200 bg-amber-50/70';
      case 'info': return 'border-blue-200 bg-blue-50/70';
      default: return 'border-slate-200 bg-white';
    }
  };

  const metrics = data?.metrics || {
    totalStaff: 54,
    onShift: 38,
    avgEfficiency: 91,
    hoursToday: 298,
    activeWorkforcePct: 70
  };

  const workloadData = data?.workloadData || [
    { department: 'Housekeeping', current: 94, optimal: 80, staff: 12 },
    { department: 'Front Office', current: 72, optimal: 75, staff: 6 },
    { department: 'F&B', current: 85, optimal: 80, staff: 18 },
    { department: 'Engineering', current: 68, optimal: 70, staff: 8 },
    { department: 'Spa', current: 45, optimal: 60, staff: 4 },
    { department: 'Security', current: 88, optimal: 85, staff: 6 },
  ];

  const efficiencyTrend = data?.efficiencyTrend || [
    { day: 'Mon', efficiency: 85 },
    { day: 'Tue', efficiency: 88 },
    { day: 'Wed', efficiency: 82 },
    { day: 'Thu', efficiency: 90 },
    { day: 'Fri', efficiency: 87 },
    { day: 'Sat', efficiency: 91 },
    { day: 'Sun', efficiency: 89 },
  ];

  const shiftSchedule = data?.shiftSchedule || [
    { time: '06:00', label: 'Early Morning', staff: 8, color: 'bg-orange-100 text-orange-700' },
    { time: '09:00', label: 'Morning Peak', staff: 24, color: 'bg-blue-100 text-blue-700' },
    { time: '14:00', label: 'Afternoon', staff: 18, color: 'bg-green-100 text-green-700' },
    { time: '18:00', label: 'Evening', staff: 22, color: 'bg-purple-100 text-purple-700' },
    { time: '22:00', label: 'Night', staff: 6, color: 'bg-slate-100 text-slate-700' },
  ];

  return (
    <motion.div className="space-y-6 staff-scheduling-page" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="success"
            role="status"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={18} />
              <span className="font-medium text-sm">{toast}</span>
            </div>
            <button className="icon-btn" onClick={() => setToast('')} style={{ color: 'inherit' }}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Total Staff</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{metrics.totalStaff}</div>
          <div className="text-sm text-slate-500 mt-1">Across 6 operational divisions</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">On Shift</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{metrics.onShift}</div>
          <div className="text-sm text-emerald-600 mt-1 font-semibold">{metrics.activeWorkforcePct}% active workforce</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-50 rounded-xl">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Avg Efficiency</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{metrics.avgEfficiency}%</div>
          <div className="text-sm text-emerald-600 mt-1 font-semibold">+4% from last week benchmark</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-50 rounded-xl">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Hours Today</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{metrics.hoursToday}</div>
          <div className="text-sm text-slate-500 mt-1">Total scheduled resort labor</div>
        </div>
      </div>

      {/* AI Recommendations - Dynamic Actions */}
      <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl p-6 border border-purple-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl text-white shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">AI Scheduling Recommendations</h3>
            <p className="text-sm text-slate-600">Dynamic workload optimization tied to 86% resort occupancy</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(data?.recommendations || []).map((rec) => (
            <div key={rec.id} className={`rounded-xl p-4 border flex flex-col justify-between ${getRecommendationStyle(rec.type)}`}>
              <div>
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                    rec.type === 'critical' ? 'text-red-600' :
                    rec.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
                  }`} />
                  <h4 className="font-semibold text-slate-900 text-sm">{rec.title}</h4>
                </div>
                <p className="text-xs text-slate-600 mb-3">{rec.description}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {rec.impact}
                </span>
                <button
                  className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200 transition-all shadow-sm"
                  disabled={busy}
                  onClick={() => handleRecommendationAction(rec)}
                >
                  {rec.action} &rarr;
                </button>
              </div>
            </div>
          ))}
          {(!data?.recommendations || data.recommendations.length === 0) && (
            <div className="col-span-3 text-center py-6 bg-white/70 rounded-xl text-slate-600 text-sm">
              All AI staffing recommendations have been executed. Shifts are fully optimized!
            </div>
          )}
        </div>
      </div>

      {/* Workload Chart and Efficiency Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Department Workload</h3>
              <p className="text-sm text-slate-500">Current vs Optimal capacity (driven by live occupancy & guest requests)</p>
            </div>
            <span className="pill text-xs">Live Synced</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={workloadData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} unit="%" />
              <YAxis dataKey="department" type="category" stroke="#64748b" fontSize={12} width={90} />
              <Tooltip formatter={(value: number) => [`${value}% capacity`, 'Load']} />
              <Bar dataKey="optimal" fill="#cbd5e1" radius={[0, 4, 4, 0]} name="Optimal" />
              <Bar dataKey="current" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Current" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Weekly Efficiency Trend</h3>
              <p className="text-sm text-slate-500">Staff performance over time</p>
            </div>
            <span className="pill text-xs">91% Average</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={efficiencyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} domain={[75, 100]} unit="%" />
              <Tooltip formatter={(val: number) => [`${val}% efficiency`, 'Score']} />
              <Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Shift Timeline - Interactive filter */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Today's Shift Timeline</h3>
            <p className="text-sm text-slate-500">Click any shift to filter on-duty staff members</p>
          </div>
          {selectedShift !== 'all' && (
            <button
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1"
              onClick={() => setSelectedShift('all')}
            >
              Clear shift filter <X size={12} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {shiftSchedule.map((shift, idx) => {
            const shiftName = shift.label.split(' ')[0];
            const isSelected = selectedShift.toLowerCase() === shiftName.toLowerCase();

            return (
              <div
                key={idx}
                className={`rounded-xl p-4 border transition-all cursor-pointer ${shift.color} ${
                  isSelected ? 'ring-2 ring-purple-600 shadow-md transform -translate-y-1' : 'hover:shadow-sm'
                }`}
                onClick={() => setSelectedShift(isSelected ? 'all' : shiftName)}
              >
                <div className="text-xs opacity-75 mb-1 font-medium">{shift.time}</div>
                <div className="font-semibold text-sm mb-1">{shift.label}</div>
                <div className="text-2xl font-bold">{shift.staff}</div>
                <div className="text-xs opacity-75">staff on duty</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Staff Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Staff Members</h3>
              <p className="text-sm text-slate-500">Live roster from SQLite &bull; Click "View Details" to view assignments or modify shifts</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select 
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm"
              >
                <option value="all">All Departments</option>
                <option value="Housekeeping">Housekeeping</option>
                <option value="Front Office">Front Office</option>
                <option value="F&B">F&B</option>
                <option value="Engineering">Engineering</option>
                <option value="Spa & Wellness">Spa & Wellness</option>
                <option value="Security">Security</option>
              </select>

              <button
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-semibold text-sm"
                onClick={() => setShowAddModal(true)}
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Staff</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hours</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Efficiency</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                        {staff.avatar}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{staff.name}</div>
                        <div className="text-xs text-slate-500">{staff.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-700">{staff.department}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      {staff.shift === 'Morning' ? <Sun className="w-4 h-4 text-orange-500" /> :
                       staff.shift === 'Night' ? <Moon className="w-4 h-4 text-indigo-500" /> :
                       <Coffee className="w-4 h-4 text-purple-500" />}
                      <span>{staff.shift}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(staff.status)}`}>
                      {staff.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900">{staff.hours}h</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${staff.efficiency >= 90 ? 'bg-emerald-500' : staff.efficiency >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${staff.efficiency}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-slate-800">{staff.efficiency}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      className="text-purple-600 hover:text-purple-800 text-sm font-bold hover:underline"
                      onClick={() => setSelectedStaff(staff)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* STAFF DETAILS MODAL */}
      <AnimatePresence>
        {selectedStaff && (
          <div className="modal-overlay" onClick={() => setSelectedStaff(null)}>
            <motion.div
              className="modal-content"
              style={{ maxWidth: '580px', width: '92%' }}
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <div className="guest-modal-header">
                <div className="header-left">
                  <div className="avatar-large" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                    {selectedStaff.avatar}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedStaff.name}</h2>
                    <p className="text-sm text-slate-500">{selectedStaff.role} &bull; {selectedStaff.department}</p>
                  </div>
                </div>
                <button className="icon-btn close-modal-btn" onClick={() => setSelectedStaff(null)}>
                  <X size={20} />
                </button>
              </div>

              <div className="guest-modal-body space-y-4">
                {/* Status Switcher Bar */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Update Real-Time Duty Status</div>
                  <div className="flex gap-2 flex-wrap">
                    {['On Shift', 'On Break', 'Off Duty'].map((st) => (
                      <button
                        key={st}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          selectedStaff.status === st
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                        disabled={busy}
                        onClick={() => handleUpdateStaffStatus(selectedStaff.id, st)}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                    <small className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Shift Assigned</small>
                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>{selectedStaff.shift} Shift ({selectedStaff.hours} hrs)</span>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                    <small className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Efficiency Rating</small>
                    <div className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
                      <Award className="w-4 h-4" />
                      <span>{selectedStaff.efficiency}% Performance Index</span>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                    <small className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Phone Contact</small>
                    <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{selectedStaff.phone || '+91 98210 11234'}</span>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                    <small className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Email</small>
                    <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5 truncate">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{selectedStaff.email || `${selectedStaff.name.toLowerCase().replace(' ', '.')}@smartresort.demo`}</span>
                    </div>
                  </div>
                </div>

                {/* Assigned Area */}
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <small className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Assigned Operational Area</small>
                  <p className="text-sm text-slate-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <span>{selectedStaff.assigned_area || 'Resort Premises - Central Wing'}</span>
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                  <button className="primary" onClick={() => setSelectedStaff(null)}>
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD STAFF MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <motion.div
              className="modal-content"
              style={{ maxWidth: '520px', width: '92%' }}
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <div className="guest-modal-header">
                <div className="header-left">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                    <UserPlus size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Add Staff Member</h2>
                    <p className="text-sm text-slate-500">Add a new team member to SQLite staff roster</p>
                  </div>
                </div>
                <button className="icon-btn close-modal-btn" onClick={() => setShowAddModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="guest-modal-body space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Employee Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={newStaff.name}
                    onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Role Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Room Attendant"
                      value={newStaff.role}
                      onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Department</label>
                    <select
                      value={newStaff.department}
                      onChange={e => setNewStaff({ ...newStaff, department: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      <option value="Housekeeping">Housekeeping</option>
                      <option value="Front Office">Front Office</option>
                      <option value="F&B">F&B</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Spa & Wellness">Spa & Wellness</option>
                      <option value="Security">Security</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Assigned Shift</label>
                    <select
                      value={newStaff.shift}
                      onChange={e => setNewStaff({ ...newStaff, shift: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      <option value="Morning">Morning (06:00 - 14:00)</option>
                      <option value="Afternoon">Afternoon (14:00 - 22:00)</option>
                      <option value="Evening">Evening (18:00 - 02:00)</option>
                      <option value="Night">Night (22:00 - 06:00)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Hours / Shift</label>
                    <input
                      type="number"
                      min={4}
                      max={12}
                      value={newStaff.hours}
                      onChange={e => setNewStaff({ ...newStaff, hours: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Assigned Area</label>
                  <input
                    type="text"
                    placeholder="e.g. Block A Floor 2, Main Dining Hall"
                    value={newStaff.assigned_area}
                    onChange={e => setNewStaff({ ...newStaff, assigned_area: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                  <button type="button" className="ghost" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary" disabled={busy}>
                    {busy ? 'Saving...' : 'Add to Staff Roster'}
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
