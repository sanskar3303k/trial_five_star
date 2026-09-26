import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Bed,
  IndianRupee,
  Wrench,
  Package,
  Heart,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const occupancyData = [
  { day: 'Mon', occupancy: 72 },
  { day: 'Tue', occupancy: 68 },
  { day: 'Wed', occupancy: 75 },
  { day: 'Thu', occupancy: 82 },
  { day: 'Fri', occupancy: 91 },
  { day: 'Sat', occupancy: 96 },
  { day: 'Sun', occupancy: 88 },
];

const revenueData = [
  { month: 'Jan', revenue: 42 },
  { month: 'Feb', revenue: 38 },
  { month: 'Mar', revenue: 45 },
  { month: 'Apr', revenue: 52 },
  { month: 'May', revenue: 48 },
  { month: 'Jun', revenue: 58 },
];

const sentimentData = [
  { name: 'Positive', value: 68, color: '#10b981' },
  { name: 'Neutral', value: 24, color: '#f59e0b' },
  { name: 'Negative', value: 8, color: '#ef4444' },
];

const aiInsights = [
  {
    id: 1,
    priority: 'Critical',
    title: 'Staff Shortage in Housekeeping',
    description: 'Housekeeping workload at 94%. 2 staff members recommended for redeployment.',
    impact: '35% faster room turnover',
    action: 'Redeploy Staff'
  },
  {
    id: 2,
    priority: 'High',
    title: 'Pool Pump Failure Risk',
    description: '78% probability of failure within 48 hours. Vibration levels critical.',
    impact: 'Prevent ₹1.85L loss',
    action: 'Schedule Maintenance'
  },
  {
    id: 3,
    priority: 'Medium',
    title: 'Milk Stock Depletion',
    description: 'Stock will run out tomorrow morning. 25L shortage predicted.',
    impact: 'Avoid breakfast disruption',
    action: 'Create Purchase Order'
  }
];

function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Occupancy Rate"
          value="91%"
          change="+14%"
          trend="up"
          icon={<Bed className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Today's Revenue"
          value="₹4.82L"
          change="+12%"
          trend="up"
          icon={<IndianRupee className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Staff Utilization"
          value="87%"
          change="-5%"
          trend="down"
          icon={<Users className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Guest Satisfaction"
          value="4.6/5"
          change="+0.2"
          trend="up"
          icon={<Heart className="w-5 h-5" />}
          color="pink"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Occupancy Forecast</h3>
              <p className="text-sm text-slate-500">Next 7 days prediction</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-semibold">+14% vs avg</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={occupancyData}>
              <defs>
                <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Area
                type="monotone"
                dataKey="occupancy"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#colorOccupancy)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revenue Trend</h3>
              <p className="text-sm text-slate-500">Monthly revenue in lakhs</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-semibold">+18% growth</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Insights & Sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insights */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">AI Recommendations</h3>
              <p className="text-sm text-slate-600">Real-time actionable insights</p>
            </div>
          </div>

          <div className="space-y-3">
            {aiInsights.map((insight) => (
              <div key={insight.id} className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                      insight.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                      insight.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {insight.priority}
                    </span>
                    <h4 className="font-semibold text-slate-900">{insight.title}</h4>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-sm text-slate-600 mb-3">{insight.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">
                    Impact: {insight.impact}
                  </span>
                  <button className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity">
                    {insight.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guest Sentiment */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Guest Sentiment</h3>
          <p className="text-sm text-slate-500 mb-6">Based on 245 reviews</p>
          
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={sentimentData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2 mt-4">
            {sentimentData.map((item) => (
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
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <QuickActionCard
          title="Staff Scheduling"
          description="Optimize workforce allocation"
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <QuickActionCard
          title="Predictive Maintenance"
          description="Prevent equipment failures"
          icon={<Wrench className="w-6 h-6" />}
          color="orange"
        />
        <QuickActionCard
          title="Inventory Management"
          description="Optimize stock levels"
          icon={<Package className="w-6 h-6" />}
          color="green"
        />
        <QuickActionCard
          title="Dynamic Pricing"
          description="Maximize revenue yield"
          icon={<TrendingUp className="w-6 h-6" />}
          color="purple"
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, change, trend, icon, color }: { title: string; value: string; change: string; trend: string; icon: React.ReactNode; color: 'blue' | 'green' | 'purple' | 'pink' }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    pink: 'bg-pink-50 text-pink-600 border-pink-200',
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-sm font-semibold ${
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {change}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-1">{value}</h3>
      <p className="text-sm text-slate-500">{title}</p>
    </div>
  );
}

function QuickActionCard({ title, description, icon, color }: { title: string; description: string; icon: React.ReactNode; color: 'blue' | 'green' | 'orange' | 'purple' }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 hover:bg-green-100',
    orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
  };

  return (
    <button className={`p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition-all text-left group ${colorClasses[color]}`}>
      <div className="mb-3">{icon}</div>
      <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
      <p className="text-sm text-slate-600">{description}</p>
    </button>
  );
}

export default Dashboard;

