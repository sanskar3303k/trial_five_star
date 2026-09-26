#!/usr/bin/env node
// Quick setup script — copies .env.example to .env if it doesn't exist
// and prints the next steps to the console.
import { existsSync, copyFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const examplePath = path.join(root, '.env.example');
const envPath = path.join(root, '.env');

if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath);
  console.log('✔  Created .env from .env.example');
} else {
  console.log('ℹ  .env already exists — skipped');
}

console.log(`
┌─────────────────────────────────────────────────────────┐
│           Smart Resort 360 — Setup complete             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Edit .env and add your API keys:                    │
│                                                         │
│     ANTHROPIC_API_KEY   → https://console.anthropic.com │
│     SUPABASE_URL        → your Supabase project URL     │
│     SUPABASE_SERVICE_ROLE_KEY → Supabase service key    │
│                                                         │
│  2. (Optional) Drop your hotel PDF in:                  │
│     server/data/hotel_info.pdf                          │
│     The RAG pipeline will parse it automatically.       │
│                                                         │
│  3. (Optional) Run the Supabase SQL schema:             │
│     supabase_schema.sql → Supabase SQL Editor           │
│                                                         │
│  4. Install dependencies:                               │
│     npm install                                         │
│                                                         │
│  5. Start the development server:                       │
│     npm run dev                                         │
│                                                         │
│  Demo credentials:                                      │
│  Guest:   guest@smartresort.demo  / Guest@360!          │
│  Manager: manager@smartresort.demo / Manager@360!       │
└─────────────────────────────────────────────────────────┘
`);
