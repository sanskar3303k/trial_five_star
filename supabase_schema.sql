-- ============================================================
-- Smart Resort 360 — Supabase Schema
-- Run this in your Supabase project → SQL Editor → New Query
-- ============================================================

-- Enable Row Level Security on all tables
-- (policies are set to service-role-only so only the backend can write)

-- ── Concierge conversation logs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS concierge_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  mode        TEXT,           -- 'rag-llm' | 'retrieval-only'
  model       TEXT,           -- claude model id used
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE concierge_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON concierge_logs USING (auth.role() = 'service_role');

-- ── Guest feedback ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  rating      INT CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  analysis    JSONB,          -- full AI analysis object
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON feedback USING (auth.role() = 'service_role');

-- ── Pricing decision logs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  inputs      JSONB,          -- occupancy, season, dow, etc.
  result      JSONB,          -- full pricing result including AI insight
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE pricing_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON pricing_logs USING (auth.role() = 'service_role');

-- ── Useful views ─────────────────────────────────────────────────────────────

-- Sentiment distribution (last 30 days)
CREATE OR REPLACE VIEW sentiment_summary AS
SELECT
  analysis->>'sentiment' AS sentiment,
  COUNT(*)               AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS pct
FROM feedback
WHERE created_at > NOW() - INTERVAL '30 days'
  AND analysis IS NOT NULL
GROUP BY sentiment;

-- Daily concierge usage
CREATE OR REPLACE VIEW concierge_daily AS
SELECT
  DATE(created_at) AS day,
  COUNT(*)         AS queries,
  COUNT(CASE WHEN mode = 'rag-llm' THEN 1 END) AS llm_queries
FROM concierge_logs
GROUP BY day
ORDER BY day DESC;

-- Average pricing factor by day of week
CREATE OR REPLACE VIEW pricing_dow AS
SELECT
  (inputs->>'dow')::INT AS dow,
  ROUND(AVG((result->>'factor')::NUMERIC), 3) AS avg_factor,
  COUNT(*) AS decisions
FROM pricing_logs
GROUP BY dow
ORDER BY dow;
