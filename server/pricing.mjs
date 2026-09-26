// AI-powered dynamic pricing engine
//
// ML model: gradient-boosted stump ensemble (pure JS, no deps).
// LLM layer: Gemini generates a revenue strategy insight on top of the ML output.

import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Synthetic training data ───────────────────────────────────────────────────
function generateTrainingData(n = 400) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const occupancy     = Math.random() * 100;
    const season        = 0.5 + Math.random();
    const dow           = Math.floor(Math.random() * 7);
    const lead_days     = Math.floor(Math.random() * 90);
    const competitor_avg = 8000 + Math.random() * 20000;
    const local_events  = Math.random() > 0.8 ? 1 : 0;
    const review_score  = 3 + Math.random() * 2;

    const factor =
      0.85
      + (occupancy / 100) * 0.4
      + (season - 1) * 0.25
      + (dow >= 5 ? 0.08 : 0)
      + (lead_days < 7 ? 0.06 : lead_days > 60 ? -0.04 : 0)
      + ((competitor_avg - 15000) / 100000) * 0.1
      + local_events * 0.12
      + ((review_score - 4) / 1) * 0.05;

    rows.push({ occupancy, season, dow, lead_days, competitor_avg, local_events, review_score,
      factor: Math.min(1.45, Math.max(0.75, factor)) });
  }
  return rows;
}

// ── Gradient-boosted stump ensemble ──────────────────────────────────────────
function trainModel(data) {
  const feats = row => [
    row.occupancy / 100,
    row.season - 1,
    row.dow / 6,
    row.lead_days / 90,
    (row.competitor_avg - 15000) / 20000,
    row.local_events,
    (row.review_score - 3) / 2,
  ];

  const LR = 0.15;
  const TREES = 60;
  const predictions = data.map(() => 1.0);
  const trees = [];

  for (let t = 0; t < TREES; t++) {
    const residuals = data.map((row, i) => row.factor - predictions[i]);
    const f = feats(data[0]).length;
    let bestTree = null, bestLoss = Infinity;
    for (let fi = 0; fi < f; fi++) {
      const vals = data.map(row => feats(row)[fi]);
      const thresholds = [...new Set(vals.map(v => Math.round(v * 20) / 20))].sort((a, b) => a - b);
      for (const thr of thresholds) {
        const left = [], right = [];
        data.forEach((_, i) => { (vals[i] <= thr ? left : right).push(i); });
        if (!left.length || !right.length) continue;
        const lMean = left.reduce((s, i) => s + residuals[i], 0) / left.length;
        const rMean = right.reduce((s, i) => s + residuals[i], 0) / right.length;
        const loss = left.reduce((s, i) => s + (residuals[i] - lMean) ** 2, 0)
                   + right.reduce((s, i) => s + (residuals[i] - rMean) ** 2, 0);
        if (loss < bestLoss) { bestLoss = loss; bestTree = { fi, thr, lMean, rMean }; }
      }
    }
    if (!bestTree) break;
    trees.push(bestTree);
    data.forEach((row, i) => {
      const v = feats(row)[bestTree.fi];
      predictions[i] += LR * (v <= bestTree.thr ? bestTree.lMean : bestTree.rMean);
    });
  }

  return function predict(input) {
    const v = feats(input);
    let pred = 1.0;
    for (const tree of trees) {
      pred += LR * (v[tree.fi] <= tree.thr ? tree.lMean : tree.rMean);
    }
    return Math.min(1.45, Math.max(0.75, pred));
  };
}

// ── Boot model once ───────────────────────────────────────────────────────────
let _predict = null;
function getPredictor() {
  if (!_predict) {
    _predict = trainModel(generateTrainingData(400));
    console.log('[Pricing] ML model trained on 400-row synthetic dataset');
  }
  return _predict;
}

const ROOMS = [
  { id: 'standard', name: 'Garden Room',        base: 6500  },
  { id: 'suite',    name: 'Ocean Suite',         base: 14500 },
  { id: 'villa',    name: 'Private Pool Villa',  base: 28000 },
];

// ── Gemini insight layer ──────────────────────────────────────────────────────
function getClient() {
  const key = process.env.GEMINI_API_KEY;
  return key && !key.includes('YOUR_KEY') ? new GoogleGenerativeAI(key) : null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function geminiPriceInsight(inputs, rooms) {
  const genAI = getClient();
  if (!genAI) return null;

  const prompt = `You are a hotel revenue manager AI.
Current inputs: occupancy ${inputs.occupancy}%, season factor ${inputs.season},
day of week ${DAYS[inputs.dow]}, lead time ${inputs.lead_days} days,
competitor avg ₹${inputs.competitor_avg}, local events: ${inputs.local_events ? 'yes' : 'no'},
review score ${inputs.review_score}/5.

ML-recommended prices:
${rooms.map(r => `- ${r.name}: ₹${r.recommended} (${r.change > 0 ? '+' : ''}${r.change}% from base)`).join('\n')}

Give a 2-sentence revenue strategy insight. Be specific and actionable. No markdown.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.warn('[Pricing] Gemini insight failed:', e.message);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function pricingScenario(inputs) {
  const {
    occupancy     = 70,
    season        = 1,
    dow           = new Date().getDay(),
    lead_days     = 14,
    competitor_avg = 15000,
    local_events  = 0,
    review_score  = 4.2,
  } = inputs;

  const factor = getPredictor()({ occupancy, season, dow, lead_days, competitor_avg, local_events, review_score });

  const rooms = ROOMS.map(room => ({
    ...room,
    recommended: Math.round(room.base * factor / 100) * 100,
    change:      Math.round((factor - 1) * 100),
    factor:      Math.round(factor * 100) / 100,
  }));

  const insight = await geminiPriceInsight(
    { occupancy, season, dow, lead_days, competitor_avg, local_events, review_score },
    rooms,
  );

  return {
    rooms,
    factor:  Math.round(factor * 100) / 100,
    method:  'ml-gradient-boost + gemini',
    insight: insight || defaultInsight(factor, occupancy),
    inputs:  { occupancy, season, dow, lead_days, competitor_avg, local_events, review_score },
  };
}

function defaultInsight(factor, occupancy) {
  if (factor > 1.25) return `High demand detected (${Math.round(occupancy)}% occupancy) — premium pricing applied. Consider extending minimum stay requirements.`;
  if (factor < 0.9)  return `Low demand period — promotional pricing active. Consider package deals to drive bookings.`;
  return `Moderate demand — prices set competitively. Monitor lead-time bookings for further adjustment.`;
}

// Backward-compat simple scenario (used by legacy routes)
export function priceScenario(occupancy, season) {
  const factor = Math.min(1.35, Math.max(0.8, 1 + (occupancy - 70) * 0.004 + (season - 1) * 0.3));
  return ROOMS.map(room => ({ ...room, recommended: Math.round(room.base * factor / 100) * 100, change: Math.round((factor - 1) * 100) }));
}
