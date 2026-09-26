import { motion } from 'framer-motion';
import React, { useState, useCallback } from 'react';
import {
  TrendingUp, DollarSign, Zap, BarChart3, Loader2,
  RefreshCw, CheckCircle, AlertCircle, ChevronUp, ChevronDown,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { api, money } from '../services/api';

type PricingRoom = {
  id: string; name: string; base: number;
  recommended: number; change: number; factor: number;
};
type PricingResult = {
  rooms: PricingRoom[];
  factor: number;
  method: string;
  insight: string | null;
  inputs: Record<string, number>;
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Static competitor benchmark (illustrative — replace with live feed in prod)
const COMPETITORS = [
  { hotel: 'Taj Lake Palace', price: 35000 },
  { hotel: 'Oberoi Udaivilas', price: 38000 },
  { hotel: 'Leela Palace', price: 32000 },
  { hotel: 'Trident', price: 28000 },
];

function DynamicPricing() {
  const today = new Date();
  const [occupancy, setOccupancy] = useState(72);
  const [season, setSeason] = useState(1.0);
  const [dow, setDow] = useState(today.getDay());
  const [leadDays, setLeadDays] = useState(14);
  const [competitorAvg, setCompetitorAvg] = useState(15000);
  const [localEvents, setLocalEvents] = useState(false);
  const [reviewScore, setReviewScore] = useState(4.2);

  const [result, setResult] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const runScenario = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<PricingResult>('/pricing/scenario', 'POST', {
        occupancy, season, dow, lead_days: leadDays,
        competitor_avg: competitorAvg, local_events: localEvents ? 1 : 0, review_score: reviewScore,
      });
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Pricing scenario failed.');
    } finally {
      setLoading(false);
    }
  }, [occupancy, season, dow, leadDays, competitorAvg, localEvents, reviewScore]);

  async function applyRate(roomId: string) {
    setApplying(roomId);
    try {
      await api('/pricing/apply', 'POST', { id: roomId, occupancy, season });
      setApplied(prev => new Set([...prev, roomId]));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApplying(null);
    }
  }

  const demandChartData = result
    ? result.rooms.map(r => ({ name: r.name.split(' ')[0], base: r.base, recommended: r.recommended, change: r.change }))
    : [];

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Occupancy</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-900">{occupancy}%</div>
          <div className="text-xs text-green-600 mt-1">Current input</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-5 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Season</span>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900">{season.toFixed(1)}×</div>
          <div className="text-xs text-blue-600 mt-1">Factor</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-5 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700">ML Factor</span>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {result ? `${result.factor.toFixed(2)}×` : '—'}
          </div>
          <div className="text-xs text-purple-600 mt-1">{result?.method || 'Run scenario'}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-700">Day of Week</span>
            <Zap className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-900">{DAYS[dow]}</div>
          <div className="text-xs text-orange-600 mt-1">Lead: {leadDays} days</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Scenario Inputs</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1 block">Occupancy: {occupancy}%</span>
            <input type="range" min={0} max={100} value={occupancy} onChange={e => setOccupancy(+e.target.value)}
              className="w-full accent-purple-600" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1 block">Season factor: {season.toFixed(1)}</span>
            <input type="range" min={0.5} max={1.5} step={0.05} value={season} onChange={e => setSeason(+e.target.value)}
              className="w-full accent-purple-600" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1 block">Lead days: {leadDays}</span>
            <input type="range" min={0} max={90} value={leadDays} onChange={e => setLeadDays(+e.target.value)}
              className="w-full accent-purple-600" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1 block">Review score: {reviewScore}</span>
            <input type="range" min={1} max={5} step={0.1} value={reviewScore} onChange={e => setReviewScore(+e.target.value)}
              className="w-full accent-purple-600" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1 block">Day of week</span>
            <select value={dow} onChange={e => setDow(+e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1 block">Competitor avg (₹)</span>
            <input type="number" min={5000} max={80000} step={500} value={competitorAvg}
              onChange={e => setCompetitorAvg(+e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </label>
          <label className="flex items-center gap-2 col-span-2 cursor-pointer">
            <input type="checkbox" checked={localEvents} onChange={e => setLocalEvents(e.target.checked)}
              className="w-4 h-4 accent-purple-600" />
            <span className="text-sm font-medium text-slate-700">Local events / festival nearby</span>
          </label>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={runScenario}
          disabled={loading}
          className="mt-5 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          {loading ? 'Calculating…' : 'Run ML Scenario'}
        </button>
      </div>

      {/* AI Insight */}
      {result?.insight && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-5 border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 mb-1">AI Revenue Insight</div>
              <p className="text-sm text-slate-700">{result.insight}</p>
              <div className="mt-1 text-xs text-slate-400">Method: {result.method}</div>
            </div>
          </div>
        </div>
      )}

      {/* Results table */}
      {result && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">ML Pricing Recommendations</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Room</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Base</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Recommended</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Change</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {result.rooms.map(room => (
                  <tr key={room.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-4 font-semibold text-slate-900">{room.name}</td>
                    <td className="py-4 px-4 text-right text-slate-500">{money(room.base)}</td>
                    <td className="py-4 px-4 text-right font-bold text-purple-700">{money(room.recommended)}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                        room.change > 0 ? 'bg-green-100 text-green-700' :
                        room.change < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {room.change > 0 ? <ChevronUp className="w-3 h-3" /> : room.change < 0 ? <ChevronDown className="w-3 h-3" /> : null}
                        {room.change > 0 ? '+' : ''}{room.change}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {applied.has(room.id) ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm font-semibold">
                          <CheckCircle className="w-4 h-4" /> Applied
                        </span>
                      ) : (
                        <button
                          onClick={() => applyRate(room.id)}
                          disabled={applying === room.id}
                          className="px-4 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors disabled:opacity-50 flex items-center gap-1 mx-auto"
                        >
                          {applying === room.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          Apply
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart */}
      {result && demandChartData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Base vs Recommended Price</h3>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={demandChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="base" name="Base ₹" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recommended" name="Recommended ₹" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Competitor benchmarks */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Competitor Benchmarks (Premium Villa)</h3>
        <div className="space-y-3">
          {COMPETITORS.map(c => {
            const ourPrice = result?.rooms.find(r => r.id === 'villa')?.recommended || 28000;
            const diff = ourPrice - c.price;
            const pct = ((diff / c.price) * 100).toFixed(1);
            return (
              <div key={c.hotel} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="font-semibold text-slate-900">{c.hotel}</div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{money(c.price)}</div>
                  <div className={`text-xs flex items-center justify-end gap-1 ${diff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {diff < 0 ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                    We are {Math.abs(Number(pct))}% {diff < 0 ? 'below' : 'above'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default DynamicPricing;
