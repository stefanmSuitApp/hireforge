#!/usr/bin/env node
/**
 * Lighthouse (mobile profile) on the key public pages of a running site.
 * WARN-ONLY: prints scores and budget misses (`::warning::` on CI) and always
 * exits 0. Budgets: scripts/perf-budgets.json. HTML reports: dist/lighthouse/.
 *
 *   pnpm lighthouse https://sljakam.com          # live, after a deploy
 *   pnpm lighthouse http://localhost:3000        # a local production build
 *                                                # (pnpm build:web && pnpm start:web)
 * Env: LIGHTHOUSE_RUNS (default 3, median per page).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

import { heldBudgets } from './lighthouse-budgets.mjs';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const base = (
  process.argv.slice(2).find((a) => /^https?:\/\//.test(a)) ?? ''
).replace(/\/$/, '');
const RUNS = Number(process.env.LIGHTHOUSE_RUNS ?? 3) || 3;
const onCi = Boolean(process.env.CI);
const budgets = heldBudgets(
  JSON.parse(readFileSync(join(root, 'scripts/perf-budgets.json'), 'utf8'))
    .lighthouse,
  { onCi },
);

if (!base) {
  console.log('usage: pnpm lighthouse <baseUrl>');
  process.exit(0);
}

/** Home, job list, one landing page and one job (from the sitemaps when present). */
async function pages() {
  const list = [
    ['home', `${base}/sr`],
    ['jobs', `${base}/sr/jobs`],
  ];
  const first = async (file, re) => {
    try {
      const xml = await (await fetch(`${base}/sitemaps/${file}`)).text();
      return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((m) => m[1])
        .find((u) => re.test(u));
    } catch {
      return undefined;
    }
  };
  const landing = await first('landing-0.xml', /\/sr\/jobs\/city\//);
  const job = await first('jobs-0.xml', /\/sr\/jobs\//);
  if (landing) list.push(['landing', landing]);
  if (job) list.push(['job', job]);
  return list;
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const warnings = [];
const warn = (msg) => {
  warnings.push(msg);
  console.log(onCi ? `::warning title=lighthouse::${msg}` : `  ✗ ${msg}`);
};

let chrome;
try {
  chrome = await chromeLauncher.launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  const outDir = join(root, 'dist/lighthouse');
  mkdirSync(outDir, { recursive: true });
  const summary = [];
  for (const [name, url] of await pages()) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const r = await lighthouse(url, {
        port: chrome.port,
        output: 'html',
        logLevel: 'error',
        onlyCategories: Object.keys(budgets.categories),
      });
      if (r?.lhr) runs.push(r);
    }
    if (runs.length === 0) {
      warn(`${name}: no Lighthouse result for ${url}`);
      continue;
    }
    writeFileSync(join(outDir, `report-${name}.html`), runs.at(-1).report);
    const row = { page: name, url };
    console.log(`\n== ${name} ${url} (median of ${runs.length})`);
    for (const [id, budget] of Object.entries(budgets.categories)) {
      const score = median(runs.map((r) => r.lhr.categories[id]?.score ?? 0));
      row[id] = score;
      const miss = typeof budget === 'number' && score < budget;
      console.log(
        `  ${miss ? '✗' : '✓'} ${id} ${score.toFixed(2)}${typeof budget === 'number' ? ` (budget ≥ ${budget})` : ' (no budget yet)'}`,
      );
      if (miss) warn(`${name}: ${id} ${score.toFixed(2)} < ${budget}`);
    }
    for (const [id, budget] of Object.entries({
      ...budgets.metricsMs,
      ...budgets.metrics,
    })) {
      const v = median(runs.map((r) => r.lhr.audits[id]?.numericValue ?? 0));
      row[id] = v;
      const unit = id in budgets.metricsMs ? ' ms' : '';
      const shown = unit ? Math.round(v) : v.toFixed(3);
      const miss = v > budget;
      console.log(
        `  ${miss ? '✗' : '✓'} ${id} ${shown}${unit} (budget ≤ ${budget}${unit})`,
      );
      if (miss) warn(`${name}: ${id} ${shown}${unit} > ${budget}${unit}`);
    }
    // Failed SEO / a11y audits, named: the score alone doesn't say what to fix.
    for (const cat of ['seo', 'accessibility', 'best-practices']) {
      for (const ref of runs.at(-1).lhr.categories[cat]?.auditRefs ?? []) {
        const audit = runs.at(-1).lhr.audits[ref.id];
        if (ref.weight > 0 && audit?.score !== null && audit.score < 1) {
          console.log(`    · ${cat}: ${ref.id} — ${audit.title}`);
        }
      }
    }
    summary.push(row);
  }
  writeFileSync(
    join(outDir, 'summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(
    `\nlighthouse — ${warnings.length} budget warning(s) (report only); reports in dist/lighthouse/`,
  );
} catch (e) {
  console.log(`lighthouse — aborted: ${e.message} (report only)`);
} finally {
  await chrome?.kill();
}
process.exit(0);
