import { motion } from 'framer-motion';
import React, { useState } from 'react';
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Star,
  Filter,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,

} from 'recharts';

const sentimentTrend = [
  { date: 'Feb 8', positive: 68, negative: 12, neutral: 20 },
  { date: 'Feb 9', positive: 72, negative: 10, neutral: 18 },
  { date: 'Feb 10', positive: 65, negative: 18, neutral: 17 },
  { date: 'Feb 11', positive: 70, negative: 14, neutral: 16 },
  { date: 'Feb 12', positive: 74, negative: 11, neutral: 15 },
  { date: 'Feb 13', positive: 78, negative: 8, neutral: 14 },
  { date: 'Feb 14', positive: 76, negative: 9, neutral: 15 },
];

const sentimentDistribution = [
  { name: 'Positive', value: 68, color: '#10b981' },
  { name: 'Neutral', value: 24, color: '#f59e0b' },
  { name: 'Negative', value: 8, color: '#ef4444' },
];

const categorySentiment = [
  { category: 'Service', positive: 85, negative: 8, neutral: 7, avgRating: 4.6 },
  { category: 'Cleanliness', positive: 92, negative: 5, neutral: 3, avgRating: 4.8 },
  { category: 'F&B Quality', positive: 78, negative: 12, neutral: 10, avgRating: 4.3 },
  { category: 'Value for Money', positive: 72, negative: 15, neutral: 13, avgRating: 4.1 },
  { category: 'Amenities', positive: 80, negative: 10, neutral: 10, avgRating: 4.4 },
  { category: 'Location', positive: 88, negative: 6, neutral: 6, avgRating: 4.7 },
];

const recentReviews = [
  {
    id: 1,
    guest: 'Ananya M.',
    room: '405',
    rating: 5,
    date: 'Feb 14, 2026',
    sentiment: 'positive',
    category: 'Service',
    review: 'Absolutely wonderful experience! The staff went above and beyond to make our anniversary special. The spa treatment was heavenly and the room was impeccably clean.',
    keywords: ['wonderful', 'staff', 'anniversary', 'spa', 'clean']
  },
  {
    id: 2,
    guest: 'Rajesh K.',
    room: '312',
    rating: 4,
    date: 'Feb 14, 2026',
    sentiment: 'positive',
    category: 'F&B Quality',
    review: 'Great food variety at the breakfast buffet. The chef accommodated my dietary restrictions without any issues. Pool area could use more loungers.',
    keywords: ['food', 'breakfast', 'chef', 'pool']
  },
  {
    id: 3,
    guest: 'Priya S.',
    room: '501',
    rating: 3,
    date: 'Feb 13, 2026',
    sentiment: 'neutral',
    category: 'Value for Money',
    review: 'Decent stay overall. Room was comfortable but felt the price was a bit high for the amenities provided. Good location though.',
    keywords: ['comfortable', 'price', 'amenities', 'location']
  },
  {
    id: 4,
    guest: 'Vikram S.',
    room: '205',
    rating: 2,
    date: 'Feb 13, 2026',
    sentiment: 'negative',
    category: 'Service',
    review: 'Waited 45 minutes for room service. The food was cold when it arrived. Disappointing experience for the price point.',
    keywords: ['room service', 'waited', 'cold food', 'disappointing']
  },
  {
    id: 5,
    guest: 'Sneha K.',
    room: '408',
    rating: 5,
    date: 'Feb 12, 2026',
    sentiment: 'positive',
    category: 'Cleanliness',
    review: 'Immaculate room! Housekeeping team does an exceptional job. The attention to detail is remarkable. Will definitely return.',
    keywords: ['immaculate', 'housekeeping', 'attention to detail']
  }
];

const trendingTopics = [
  { topic: 'Spa Services', mentions: 45, sentiment: 'positive', trend: '+15%' },
  { topic: 'Breakfast Buffet', mentions: 38, sentiment: 'positive', trend: '+8%' },
  { topic: 'Pool Cleanliness', mentions: 32, sentiment: 'neutral', trend: '+2%' },
  { topic: 'Room Service Speed', mentions: 28, sentiment: 'negative', trend: '-5%' },
  { topic: 'Check-in Experience', mentions: 25, sentiment: 'positive', trend: '+12%' },
  { topic: 'WiFi Quality', mentions: 22, sentiment: 'neutral', trend: '0%' },
];

const actionableInsights = [
  {
    priority: 'High',
    insight: 'Room service delays mentioned in 8% of negative reviews',
    impact: 'Affects 15-20 guests daily',
    recommendation: 'Add 2 staff during peak hours (7-9 PM)',
    expectedOutcome: 'Reduce complaints by 60%'
  },
  {
    priority: 'Medium',
    insight: 'Pool loungers shortage frequently mentioned',
    impact: 'Weekend guest satisfaction',
    recommendation: 'Add 10 additional loungers by pool area',
    expectedOutcome: 'Improve pool area rating by 0.3 points'
  },
  {
    priority: 'Low',
    insight: 'WiFi speed concerns from business travelers',
    impact: '5% of corporate bookings',
    recommendation: 'Upgrade bandwidth during peak business hours',
    expectedOutcome: 'Better corporate review scores'
  }
];

function SentimentAnalysis() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');

  const filteredReviews = recentReviews.filter(review => {
    if (selectedCategory !== 'all' && review.category !== selectedCategory) return false;
    if (sentimentFilter !== 'all' && review.sentiment !== sentimentFilter) return false;
    return true;
  });

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <ThumbsUp className="w-4 h-4 text-green-600" />;
      case 'negative': return <ThumbsDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getSentimentStyle = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-700 border-green-200';
      case 'negative': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-50 rounded-xl">
              <ThumbsUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-slate-500">Positive Sentiment</span>
          </div>
          <div className="text-3xl font-bold text-green-600">68%</div>
          <div className="text-sm text-green-600 mt-1">+4% from last week</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-50 rounded-xl">
              <Minus className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-sm text-slate-500">Neutral Sentiment</span>
          </div>
          <div className="text-3xl font-bold text-yellow-600">24%</div>
          <div className="text-sm text-slate-500 mt-1">Stable</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-50 rounded-xl">
              <ThumbsDown className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm text-slate-500">Negative Sentiment</span>
          </div>
          <div className="text-3xl font-bold text-red-600">8%</div>
          <div className="text-sm text-green-600 mt-1">-3% from last week</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-50 rounded-xl">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-slate-500">Reviews Analyzed</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">245</div>
          <div className="text-sm text-slate-500 mt-1">This month</div>
        </div>
      </div>

      {/* Sentiment Trend Chart */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Sentiment Trend</h3>
            <p className="text-sm text-slate-500">Last 7 days</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-slate-600">Positive</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-xs text-slate-600">Neutral</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-slate-600">Negative</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={sentimentTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
            <Line type="monotone" dataKey="neutral" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 4 }} />
            <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category Sentiment and Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Sentiment by Category</h3>
          <p className="text-sm text-slate-500 mb-6">Category-wise breakdown</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categorySentiment}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="category" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip />
              <Bar dataKey="positive" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="neutral" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="negative" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Overall Distribution</h3>
          <p className="text-sm text-slate-500 mb-4">Sentiment breakdown</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={sentimentDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {sentimentDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {sentimentDistribution.map((item) => (
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

      {/* Actionable Insights */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">AI Actionable Insights</h3>
            <p className="text-sm text-slate-600">Data-driven recommendations</p>
          </div>
        </div>
        <div className="space-y-3">
          {actionableInsights.map((insight, idx) => (
            <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    insight.priority === 'High' ? 'bg-red-100 text-red-700' :
                    insight.priority === 'Medium' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {insight.priority}
                  </span>
                  <h4 className="font-semibold text-slate-900">{insight.insight}</h4>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-2">Impact: {insight.impact}</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-purple-600 font-semibold">{insight.recommendation}</div>
                  <div className="text-xs text-green-600 mt-1">Expected: {insight.expectedOutcome}</div>
                </div>
                <button className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors">
                  Implement
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Topics */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Trending Topics</h3>
        <p className="text-sm text-slate-500 mb-4">Most mentioned in reviews</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {trendingTopics.map((topic, idx) => (
            <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="font-semibold text-slate-900 text-sm mb-1">{topic.topic}</div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">{topic.mentions} mentions</span>
                <span className={`text-xs font-semibold ${
                  topic.trend.startsWith('+') ? 'text-green-600' : 
                  topic.trend.startsWith('-') ? 'text-red-600' : 'text-slate-500'
                }`}>
                  {topic.trend}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                topic.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                topic.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {topic.sentiment}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recent Reviews</h3>
              <p className="text-sm text-slate-500">AI-analyzed guest feedback</p>
            </div>
            <div className="flex items-center gap-3">
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Categories</option>
                <option value="Service">Service</option>
                <option value="Cleanliness">Cleanliness</option>
                <option value="F&B Quality">F&B Quality</option>
                <option value="Value for Money">Value for Money</option>
                <option value="Amenities">Amenities</option>
                <option value="Location">Location</option>
              </select>
              <select 
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Sentiments</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredReviews.map((review) => (
            <div key={review.id} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {review.guest.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{review.guest}</div>
                    <div className="text-xs text-slate-500">Room {review.room} • {review.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-200'}`} 
                      />
                    ))}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getSentimentStyle(review.sentiment)}`}>
                    {review.sentiment}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-3">{review.review}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {review.keywords.map((keyword, idx) => (
                  <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default SentimentAnalysis;

