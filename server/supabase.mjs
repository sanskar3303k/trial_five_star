// Supabase client — lazy-initialised so the app still runs without Supabase
// credentials (falls back to SQLite-only mode with a console warning).
import { createClient } from '@supabase/supabase-js';

let _client = null;

export function getSupabase() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('YOUR_PROJECT_ID')) {
    console.warn('[Supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — running without Supabase persistence');
    return null;
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

// Safe helper — silently no-ops when Supabase is not configured
export async function sbInsert(table, row) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from(table).insert(row);
  if (error) console.error(`[Supabase] insert ${table}:`, error.message);
}

export async function sbSelect(table, filters = {}, limit = 100) {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb.from(table).select('*').limit(limit).order('created_at', { ascending: false });
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const { data, error } = await query;
  if (error) { console.error(`[Supabase] select ${table}:`, error.message); return []; }
  return data || [];
}
