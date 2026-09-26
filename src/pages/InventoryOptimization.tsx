import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from 'react';

import {
  Package as PkgIcon,
  AlertTriangle as AlertIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  ShoppingCart as CartIcon,
  BarChart3 as ChartIcon,
  Check as CheckIcon,
  X as XIcon,
  Plus as PlusIcon,
  Search as SearchIcon,
  ArrowUpRight as ArrowIcon,
  Truck as TruckIcon,
  Boxes as BoxesIcon,
  Calendar as CalIcon
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
import { api, money } from '../services/api';

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  stock: number;
  unit: string;
  min_stock: number;
  max_stock: number;
  status: 'Critical' | 'Low' | 'Optimal';
  trend: 'down' | 'up' | 'stable';
  demand: number;
  cost: number;
  supplier?: string;
  last_restocked?: string;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  items_count: number;
  total_amount: string;
  numeric_amount?: number;
  status: 'Pending' | 'Approved' | 'Shipped' | 'Received';
  expected_date: string;
  created_at?: string;
  notes?: string;
}

export interface InventoryInsight {
  id: number;
  priority: 'Critical' | 'High' | 'Medium';
  title: string;
  description: string;
  recommendation: string;
  savings: string;
  status: string;
  action_type: string;
}

export interface InventoryData {
  metrics: {
    totalItems: number;
    lowStockCount: number;
    pendingOrdersCount: number;
    pendingOrdersValue: string;
    forecastAccuracy: number;
  };
  insights: InventoryInsight[];
  demandForecast: { day: string; predicted: number; actual: number }[];
  categoryBreakdown: { name: string; value: number; color: string }[];
  items: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
}

export default function InventoryOptimization() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  // Order modal state
  const [orderItem, setOrderItem] = useState<InventoryItem | null>(null);
  const [orderUnits, setOrderUnits] = useState<number>(50);

  // Create PO modal state
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [newPO, setNewPO] = useState({
    supplier: 'Fresh Farms Co.',
    itemsCount: 8,
    amount: 32000,
    notes: 'Regular replenishment order'
  });

  const fetchInventory = async () => {
    try {
      const res = await api<InventoryData>('/inventory');
      setData(res);
    } catch (err: any) {
      console.error('Failed to load inventory data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Handle Take Action on AI Demand Insights
  const handleInsightAction = async (insight: InventoryInsight) => {
    setBusy(true);
    try {
      const res = await api<{ ok: boolean; poId: string; message: string }>(`/inventory/insights/${insight.id}/action`, 'POST');
      setToast(res.message || 'Action executed successfully!');
      await fetchInventory();
    } catch (err: any) {
      setToast(err.message || 'Failed to execute action.');
    } finally {
      setBusy(false);
    }
  };

  // Open restock order modal for an item
  const openOrderModal = (item: InventoryItem) => {
    setOrderItem(item);
    const needed = Math.max(20, Math.round(item.max_stock - item.stock));
    setOrderUnits(needed);
  };

  // Submit Restock Purchase Order
  const handleDispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderItem) return;
    setBusy(true);
    try {
      const res = await api<{ ok: boolean; poId: string; message: string }>(`/inventory/items/${orderItem.id}/order`, 'POST', {
        units: Number(orderUnits)
      });
      setToast(res.message || `Replenishment order created for ${orderItem.name}!`);
      setOrderItem(null);
      await fetchInventory();
    } catch (err: any) {
      setToast(err.message || 'Failed to dispatch order.');
    } finally {
      setBusy(false);
    }
  };

  // Submit Custom Purchase Order
  const handleCreateCustomPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPO.supplier.trim()) {
      setToast('Please enter supplier name.');
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ ok: boolean; poId: string }>(`/inventory/purchase-orders`, 'POST', newPO);
      setToast(`Purchase Order ${res.poId} created successfully!`);
      setShowCreatePO(false);
      await fetchInventory();
    } catch (err: any) {
      setToast(err.message || 'Failed to create purchase order.');
    } finally {
      setBusy(false);
    }
  };

  // Advance PO Status (Pending -> Approved -> Shipped -> Received)
  const handleAdvancePOStatus = async (po: PurchaseOrder) => {
    const nextStatusMap: Record<string, 'Approved' | 'Shipped' | 'Received'> = {
      Pending: 'Approved',
      Approved: 'Shipped',
      Shipped: 'Received'
    };
    const next = nextStatusMap[po.status];
    if (!next) return;

    setBusy(true);
    try {
      await api(`/inventory/purchase-orders/${po.id}/status`, 'PATCH', { status: next });
      if (next === 'Received') {
        setToast(`Order ${po.id} marked as Received! Inventory stock has been automatically restocked.`);
      } else {
        setToast(`Order ${po.id} status updated to ${next}.`);
      }
      await fetchInventory();
    } catch (err: any) {
      setToast(err.message || 'Failed to update order status.');
    } finally {
      setBusy(false);
    }
  };

  const items = data?.items || [];
  const filteredItems = items.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false;
    }
    return true;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Critical': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Low': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Optimal': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const metrics = data?.metrics || {
    totalItems: 1247,
    lowStockCount: 5,
    pendingOrdersCount: 3,
    pendingOrdersValue: '₹86,350',
    forecastAccuracy: 94
  };

  const insights = data?.insights || [];
  const demandForecast = data?.demandForecast || [
    { day: 'Mon', predicted: 85, actual: 82 },
    { day: 'Tue', predicted: 90, actual: 88 },
    { day: 'Wed', predicted: 75, actual: 78 },
    { day: 'Thu', predicted: 95, actual: 92 },
    { day: 'Fri', predicted: 110, actual: 108 },
    { day: 'Sat', predicted: 125, actual: 130 },
    { day: 'Sun', predicted: 115, actual: 112 },
  ];

  const categoryBreakdown = data?.categoryBreakdown || [
    { name: 'F&B', value: 45, color: '#3b82f6' },
    { name: 'Housekeeping', value: 25, color: '#8b5cf6' },
    { name: 'Amenities', value: 15, color: '#10b981' },
    { name: 'Maintenance', value: 15, color: '#f59e0b' },
  ];

  const purchaseOrders = data?.purchaseOrders || [];

  return (
    <motion.div className="space-y-6 inventory-optimization-page" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
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
              <CheckIcon size={18} />
              <span className="font-medium text-sm">{toast}</span>
            </div>
            <button className="icon-btn" onClick={() => setToast('')} style={{ color: 'inherit' }}>
              <XIcon size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <PkgIcon className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Total Items</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{metrics.totalItems.toLocaleString()}</div>
          <div className="text-sm text-slate-500 mt-1">Across 8 operational resort categories</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-rose-50 rounded-xl">
              <AlertIcon className="w-5 h-5 text-rose-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Low Stock Items</span>
          </div>
          <div className="text-3xl font-bold text-rose-600">{metrics.lowStockCount}</div>
          <div className="text-sm text-rose-600 mt-1 font-semibold">Immediate reorder required</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-50 rounded-xl">
              <CartIcon className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Pending Orders</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{metrics.pendingOrdersCount}</div>
          <div className="text-sm text-purple-600 mt-1 font-semibold">{metrics.pendingOrdersValue} order value</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <TrendUpIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Forecast Accuracy</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{metrics.forecastAccuracy}%</div>
          <div className="text-sm text-emerald-600 mt-1 font-semibold">+3% ML model benchmark</div>
        </div>
      </div>

      {/* AI Demand Forecasting Insights */}
      <div className="bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 rounded-2xl p-6 border border-blue-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl text-white shadow-sm">
            <ChartIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">AI Demand Forecasting Insights</h3>
            <p className="text-sm text-slate-600">Interconnected with guest in-room dining, occupancy & housekeeping consumption</p>
          </div>
        </div>

        <div className="space-y-3">
          {insights.map((insight) => (
            <div key={insight.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    insight.priority === 'Critical' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                    insight.priority === 'High' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {insight.priority}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">{insight.title}</h4>
                </div>
                <p className="text-xs text-slate-600 mb-2">{insight.description}</p>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className="text-purple-700 font-semibold">{insight.recommendation}</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    💡 {insight.savings}
                  </span>
                </div>
              </div>

              <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex-shrink-0"
                disabled={busy}
                onClick={() => handleInsightAction(insight)}
              >
                Take Action &rarr;
              </button>
            </div>
          ))}
          {insights.length === 0 && (
            <div className="p-4 bg-white/80 rounded-xl text-center text-slate-600 text-sm">
              All predictive inventory insights have been addressed. Stock levels optimal!
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Demand Forecast Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Demand Forecast vs Actual</h3>
              <p className="text-sm text-slate-500">Weekly consumption pattern across resort inventory</p>
            </div>
            <span className="pill text-xs">ML Predictive</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={demandForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} name="Predicted" />
              <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Inventory by Category</h3>
          <p className="text-sm text-slate-500 mb-4">Value distribution</p>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie
                data={categoryBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {categoryBreakdown.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Inventory Items</h3>
              <p className="text-sm text-slate-500">Live SQLite stock levels &bull; Click "Order" to generate an emergency or scheduled Purchase Order</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search items or suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 bg-white shadow-sm"
                />
              </div>
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
              >
                <option value="all">All Categories</option>
                <option value="Dairy">Dairy</option>
                <option value="Meat">Meat</option>
                <option value="Grains">Grains</option>
                <option value="Oils">Oils</option>
                <option value="Produce">Produce</option>
                <option value="Housekeeping">Housekeeping</option>
                <option value="Amenities">Amenities</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item & Supplier</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Stock Level</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Daily Demand</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Cost</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const stockRatio = item.stock / item.max_stock;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.supplier || 'Resort Approved Supplier'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{item.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-slate-900">{item.stock} {item.unit}</span>
                          {item.trend === 'down' ? (
                            <TrendDownIcon className="w-4 h-4 text-rose-500" />
                          ) : (
                            <TrendUpIcon className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              stockRatio >= 0.5 ? 'bg-emerald-500' :
                              stockRatio >= 0.25 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, stockRatio * 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">Min: {item.min_stock} | Max: {item.max_stock}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusStyle(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-800">{item.demand} {item.unit}/day</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      ₹{item.cost} / {item.unit}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center gap-1 hover:underline"
                        onClick={() => openOrderModal(item)}
                      >
                        Order <ArrowIcon className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Purchase Orders - Live Sync with Restock */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Recent Purchase Orders</h3>
            <p className="text-sm text-slate-500">
              Live PO tracking &bull; Click on any status pill to advance status (Pending &rarr; Approved &rarr; Shipped &rarr; Received to restock!)
            </p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-semibold text-sm"
            onClick={() => setShowCreatePO(true)}
          >
            <CartIcon className="w-4 h-4" />
            <span>Create Order</span>
          </button>
        </div>

        <div className="space-y-3">
          {purchaseOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:shadow-sm transition-all flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-purple-600 shadow-sm">
                  <PkgIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>{order.id}</span>
                    <span className="text-xs text-slate-500 font-normal">({order.notes || 'Procurement'})</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <b>{order.supplier}</b> &bull; {order.items_count} items &bull; Expected {order.expected_date}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="text-right">
                  <div className="font-bold text-slate-900 text-sm">{order.total_amount}</div>
                  <div className="text-xs text-slate-400">Total Procurement Cost</div>
                </div>

                <button
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ${
                    order.status === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200' :
                    order.status === 'Approved' ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200' :
                    order.status === 'Shipped' ? 'bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200' :
                    'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                  disabled={busy || order.status === 'Received'}
                  title={order.status === 'Received' ? 'Items already restocked' : 'Click to advance status'}
                  onClick={() => handleAdvancePOStatus(order)}
                >
                  <span>{order.status}</span>
                  {order.status !== 'Received' && <span className="opacity-75">&rarr;</span>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ORDER RESTOCK MODAL */}
      <AnimatePresence>
        {orderItem && (
          <div className="modal-overlay" onClick={() => setOrderItem(null)}>
            <motion.div
              className="modal-content"
              style={{ maxWidth: '500px', width: '92%' }}
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <div className="guest-modal-header">
                <div className="header-left">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                    <CartIcon size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Order Stock Replenishment</h2>
                    <p className="text-sm text-slate-500">Create purchase order for {orderItem.name}</p>
                  </div>
                </div>
                <button className="icon-btn close-modal-btn" onClick={() => setOrderItem(null)}>
                  <XIcon size={20} />
                </button>
              </div>

              <form onSubmit={handleDispatchOrder} className="guest-modal-body space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Supplier:</span>
                    <span className="font-bold text-slate-800">{orderItem.supplier || 'Primary Resort Supplier'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Current In-Stock:</span>
                    <span className="font-bold text-slate-800">{orderItem.stock} {orderItem.unit} (Min: {orderItem.min_stock})</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Unit Cost:</span>
                    <span className="font-bold text-slate-800">₹{orderItem.cost} / {orderItem.unit}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Units to Replenish ({orderItem.unit}) *
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={1000}
                    value={orderUnits}
                    onChange={e => setOrderUnits(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-between items-center mt-2 text-xs font-semibold text-slate-700">
                    <span>Estimated Total PO Cost:</span>
                    <span className="text-base font-bold text-blue-700">₹{(orderUnits * orderItem.cost).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                  <button type="button" className="ghost" onClick={() => setOrderItem(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary" disabled={busy}>
                    {busy ? 'Dispatching...' : 'Dispatch Purchase Order'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE PURCHASE ORDER MODAL */}
      <AnimatePresence>
        {showCreatePO && (
          <div className="modal-overlay" onClick={() => setShowCreatePO(false)}>
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
                    <CartIcon size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Create Purchase Order</h2>
                    <p className="text-sm text-slate-500">Draft and dispatch a new PO to suppliers</p>
                  </div>
                </div>
                <button className="icon-btn close-modal-btn" onClick={() => setShowCreatePO(false)}>
                  <XIcon size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateCustomPO} className="guest-modal-body space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fresh Farms Co. / Meat Masters"
                    value={newPO.supplier}
                    onChange={e => setNewPO({ ...newPO, supplier: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Item Count</label>
                    <input
                      type="number"
                      min={1}
                      value={newPO.itemsCount}
                      onChange={e => setNewPO({ ...newPO, itemsCount: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Total Amount (₹)</label>
                    <input
                      type="number"
                      min={100}
                      value={newPO.amount}
                      onChange={e => setNewPO({ ...newPO, amount: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Order Notes / Items Description</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Organic dairy, herbs, high-demand breakfast supplies"
                    value={newPO.notes}
                    onChange={e => setNewPO({ ...newPO, notes: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                  <button type="button" className="ghost" onClick={() => setShowCreatePO(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary" disabled={busy}>
                    {busy ? 'Creating...' : 'Submit Purchase Order'}
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
