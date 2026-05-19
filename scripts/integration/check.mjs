#!/usr/bin/env node
/**
 * Step 1.8 smoke check (requires API running). Optional: worker for BullMQ job logs.
 *
 * Usage:
 *   pnpm dev:api   # other terminal
 *   pnpm integration:check
 *
 * Env:
 *   INTEGRATION_API_URL — default NEXT_PUBLIC_API_URL or http://localhost:4000
 *   STRICT=1            — exit 2 if any check is "down" (not "skipped")
 */

const apiBase = (
  process.env.INTEGRATION_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000'
).replace(/\/$/, '');

const url = `${apiBase}/api/integration`;

const res = await fetch(url);
const text = await res.text();
console.log(`${res.status} ${url}`);
console.log(text);

if (!res.ok) {
  process.exit(1);
}

let data;
try {
  data = JSON.parse(text);
} catch {
  process.exit(1);
}

if (process.env.STRICT === '1') {
  const keys = ['postgres', 'redis', 'bullmq', 'sanity'];
  const failed = keys.filter((k) => data[k] === 'down');
  if (failed.length) {
    console.error(`STRICT: down → ${failed.join(', ')}`);
    process.exit(2);
  }
}
