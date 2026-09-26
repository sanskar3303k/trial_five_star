// RAG (Retrieval-Augmented Generation) pipeline
// 1. Chunks hotel PDF / embedded text into passages
// 2. Retrieves top-k chunks by TF-IDF cosine similarity (no external embedding API needed)
// 3. Sends retrieved context + user question to Gemini for a grounded answer
//
// To use a real PDF: place hotel_info.pdf in server/data/ — it will be parsed automatically.

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HOTEL_INFO_TEXT } from './hotel_info.pdf.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// ── PDF parsing (optional) ────────────────────────────────────────────────────
async function loadPdfText() {
  const pdfPath = path.join(here, 'data', 'hotel_info.pdf');
  if (!existsSync(pdfPath)) return null;
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const buf = readFileSync(pdfPath);
    const { text } = await pdfParse(buf);
    return text;
  } catch (e) {
    console.warn('[RAG] pdf-parse not available or PDF unreadable:', e.message);
    return null;
  }
}

// ── Chunking ──────────────────────────────────────────────────────────────────
function chunkText(text, size = 400, overlap = 80) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += size - overlap) {
    chunks.push(words.slice(i, i + size).join(' '));
    if (i + size >= words.length) break;
  }
  return chunks;
}

// ── TF-IDF cosine similarity retriever ───────────────────────────────────────
function tokenise(text) {
  return text.toLowerCase().match(/[a-z0-9]+/g) || [];
}

function buildTfIdf(chunks) {
  const tf = chunks.map(chunk => {
    const tokens = tokenise(chunk);
    const freq = {};
    for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
    const total = tokens.length || 1;
    for (const t in freq) freq[t] /= total;
    return freq;
  });
  const df = {};
  for (const freq of tf) for (const t in freq) df[t] = (df[t] || 0) + 1;
  const N = chunks.length;
  const idf = {};
  for (const t in df) idf[t] = Math.log(N / df[t]);
  const tfidf = tf.map(freq => {
    const vec = {};
    for (const t in freq) vec[t] = freq[t] * (idf[t] || 1);
    return vec;
  });
  return { tfidf, idf };
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const t in a) { dot += (a[t] || 0) * (b[t] || 0); na += a[t] ** 2; }
  for (const t in b) nb += b[t] ** 2;
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function queryVec(query, idf) {
  const tokens = tokenise(query);
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  const total = tokens.length || 1;
  const vec = {};
  for (const t in freq) vec[t] = (freq[t] / total) * (idf[t] || 1);
  return vec;
}

// ── Initialise (lazy) ─────────────────────────────────────────────────────────
let _chunks = null;
let _index = null;

async function ensureIndex() {
  if (_chunks) return;
  const pdfText = await loadPdfText();
  const text = pdfText || HOTEL_INFO_TEXT;
  _chunks = chunkText(text);
  _index = buildTfIdf(_chunks);
  console.log(`[RAG] Index ready — ${_chunks.length} chunks from ${pdfText ? 'PDF' : 'embedded text'}`);
}

function retrieve(query, k = 4) {
  const qv = queryVec(query, _index.idf);
  return _chunks
    .map((chunk, i) => ({ chunk, score: cosine(qv, _index.tfidf[i]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .filter(x => x.score > 0)
    .map(x => x.chunk);
}

// ── Google Gemini ─────────────────────────────────────────────────────────────
function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.includes('YOUR_KEY')) return null;
  return new GoogleGenerativeAI(key);
}

const SYSTEM_PROMPT = `You are the AI concierge for Smart Resort 360, a luxury 5-star resort.
Answer guest questions using ONLY the context provided below.
Be warm, concise, and helpful. If the answer is not in the context, say you will
connect the guest with the front desk team and do NOT invent information.
Never mention that you are using a "context" or "document" — speak naturally.
Format prices in Indian Rupees (₹).`;

// ── Public API ────────────────────────────────────────────────────────────────
export async function ragAnswer(question, liveRates = null) {
  await ensureIndex();

  const contexts = retrieve(question);

  // Dynamic live rates context injected from manager revenue settings
  let ratesContext = '';
  if (liveRates) {
    const gardenRate = liveRates.standard?.amount || 6500;
    const suiteRate  = liveRates.suite?.amount || 14500;
    const villaRate  = liveRates.villa?.amount || 28000;

    ratesContext = `\n\n=== CURRENT LIVE ROOM RATES (SYNCHRONIZED REAL-TIME FROM RESORT REVENUE MANAGEMENT) ===
These are the EXACT, current rates per room per night set dynamically by resort management:
• Garden Room: ₹${gardenRate.toLocaleString('en-IN')} per night
• Ocean Suite: ₹${suiteRate.toLocaleString('en-IN')} per night
• Private Pool Villa: ₹${villaRate.toLocaleString('en-IN')} per night

CRITICAL INSTRUCTION FOR ROOM PRICING:
When the guest asks about room prices, room rates, tariffs, suite costs, or villa charges, ALWAYS quote these exact CURRENT LIVE ROOM RATES (Garden Room: ₹${gardenRate.toLocaleString('en-IN')}, Ocean Suite: ₹${suiteRate.toLocaleString('en-IN')}, Private Pool Villa: ₹${villaRate.toLocaleString('en-IN')}).
NEVER quote the outdated sample rates from older documents.`;
  }

  const contextText = (contexts.length
    ? contexts.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')
    : 'No specific information found in the resort guide.') + ratesContext;

  const genAI = getClient();
  if (!genAI) {
    // Check if the question is asking about room price/rates in fallback mode
    if (/\b(price|rate|rates|cost|tariff|how much|per night|room charges)\b/i.test(question) && liveRates) {
      const gRate = (liveRates.standard?.amount || 6500).toLocaleString('en-IN');
      const sRate = (liveRates.suite?.amount || 14500).toLocaleString('en-IN');
      const vRate = (liveRates.villa?.amount || 28000).toLocaleString('en-IN');
      return {
        answer: `Welcome to Smart Resort 360! Here are our current live room rates per night:\n\n• **Garden Room:** ₹${gRate} per night\n• **Ocean Suite:** ₹${sRate} per night\n• **Private Pool Villa:** ₹${vRate} per night (includes daily breakfast for 2, airport transfers, and butler service)\n\nAll rates reflect the active dynamic rates set by our resort management team. Please let me know if you would like to book or need any assistance!`,
        sources: [{ id: 'dynamic-rates', title: 'Live Dynamic Revenue Rates' }],
        mode: 'dynamic-rates',
        model: null,
      };
    }

    return {
      answer: contexts.length
        ? contexts[0].slice(0, 600) + (contexts[0].length > 600 ? '…' : '')
        : 'I could not find a verified answer in the resort guide. Please contact the front desk at Dial 0 or use the Special Requests feature.',
      sources: contexts.slice(0, 2).map((c, i) => ({ id: `chunk-${i}`, title: c.slice(0, 60) + '…' })),
      mode: 'retrieval-only',
      model: null,
    };
  }

  const candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-3-flash-preview'
  ];

  let answerText = null;
  let usedModel = 'gemini-3.5-flash-lite';
  const prompt = `${SYSTEM_PROMPT}\n\nContext from the resort guide and live pricing system:\n${contextText}\n\nGuest question: ${question}`;

  for (const mName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({ model: mName });
      const result = await model.generateContent(prompt);
      answerText = result.response.text();
      usedModel = mName;
      if (answerText) break;
    } catch (e) {
      console.warn(`[RAG] Model ${mName} failed:`, e.message?.slice(0, 100));
    }
  }

  if (!answerText) {
    if (/\b(price|rate|rates|cost|tariff|how much|per night|room charges)\b/i.test(question) && liveRates) {
      const gRate = (liveRates.standard?.amount || 6500).toLocaleString('en-IN');
      const sRate = (liveRates.suite?.amount || 14500).toLocaleString('en-IN');
      const vRate = (liveRates.villa?.amount || 28000).toLocaleString('en-IN');
      answerText = `Here are our current live room rates per night:\n• **Garden Room:** ₹${gRate} per night\n• **Ocean Suite:** ₹${sRate} per night\n• **Private Pool Villa:** ₹${vRate} per night.\n\nAll rates are dynamically synchronized with resort management.`;
    } else {
      answerText = contexts.length ? contexts[0].slice(0, 600) : 'I am currently unable to fetch the answer. Please contact the front desk.';
    }
  }

  return {
    answer: answerText,
    sources: [
      ...(liveRates && /\b(price|rate|cost|tariff|night)\b/i.test(question) ? [{ id: 'dynamic-pricing', title: 'Live Dynamic Revenue Management' }] : []),
      ...contexts.slice(0, 2).map((c, i) => ({ id: `chunk-${i}`, title: c.slice(0, 60) + '…' }))
    ],
    mode: 'rag-llm',
    model: usedModel,
  };
}
