#!/usr/bin/env node
/**
 * Renders the 10 home category tile images (1200×660 PNG) from lucide icons
 * in the Design A palette. Tiles show at ~218×120 on desktop and full width ×
 * 120 on phones, so everything sits in the middle band and survives a 2.7:1
 * crop. Output: scripts/cms/home-images/categories/<slug>.png
 *
 * Usage: node scripts/cms/home-images/generate-category-images.mjs
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const out = join(here, 'categories');
mkdirSync(out, { recursive: true });

const lucideDir = dirname(
  createRequire(join(root, 'apps/web/package.json')).resolve(
    'lucide-react/package.json',
  ),
);

async function iconNode(name) {
  const mod = await import(
    pathToFileURL(join(lucideDir, 'dist/esm/icons', `${name}.js`)).href
  );
  return mod.__iconNode;
}

/** One lucide icon as an SVG group, `size` px wide, centred on (cx, cy). */
async function icon(name, cx, cy, size, color, stroke = 1.5) {
  const parts = (await iconNode(name))
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .filter(([k]) => k !== 'key')
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      return `<${tag} ${a}/>`;
    })
    .join('');
  const s = size / 24;
  return `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${s})" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${parts}</g>`;
}

// Design A tokens: primary #0B6E65, gold #F6C452, goldtext #6B4A06,
// primarysoft #E3F2EF, goldsoft #FFF1D6, warm #F3EEE5.
const palettes = [
  { bg: '#E3F2EF', disc: '#CBE6E0', dot: '#F6C452', side: '#0B6E65' },
  { bg: '#FFF1D6', disc: '#FBE2AE', dot: '#0B6E65', side: '#6B4A06' },
  { bg: '#F3EEE5', disc: '#E6DCCB', dot: '#F6C452', side: '#0B6E65' },
];

const categories = [
  ['trgovina-i-prodaja', 'shopping-bag', 'tag', 'store'],
  ['proizvodnja', 'factory', 'cog', 'package'],
  ['usluge-i-zanati', 'wrench', 'hammer', 'scissors'],
  ['ugostiteljstvo-i-turizam', 'chef-hat', 'coffee', 'luggage'],
  ['gradjevinarstvo-i-arhitektura', 'hard-hat', 'ruler', 'building-2'],
  ['transport-i-logistika', 'truck', 'package', 'map-pin'],
  ['informacione-tehnologije', 'laptop', 'code-xml', 'cpu'],
  ['administracija', 'folder-open', 'clipboard-list', 'paperclip'],
  ['zdravstvo-i-socijalna-zastita', 'stethoscope', 'heart-pulse', 'hand-heart'],
  ['finansije-i-racunovodstvo', 'calculator', 'coins', 'trending-up'],
];

const W = 1200;
const H = 660;

async function svgFor([, main, left, right], i) {
  const p = palettes[i % palettes.length];
  const chip = (x, y) =>
    `<rect x="${x - 78}" y="${y - 78}" width="156" height="156" rx="40" fill="#FFFFFF"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${p.bg}"/>
  <circle cx="${W / 2}" cy="${H / 2}" r="235" fill="${p.disc}"/>
  <circle cx="${W / 2 + 190}" cy="${H / 2 - 150}" r="30" fill="${p.dot}"/>
  <circle cx="${W / 2 - 230}" cy="${H / 2 + 175}" r="16" fill="${p.dot}"/>
  ${await icon(main, W / 2, H / 2, 250, '#0B6E65')}
  ${chip(W / 2 - 330, H / 2 + 70)}
  ${await icon(left, W / 2 - 330, H / 2 + 70, 84, p.side, 1.75)}
  ${chip(W / 2 + 330, H / 2 - 60)}
  ${await icon(right, W / 2 + 330, H / 2 - 60, 84, p.side, 1.75)}
</svg>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
for (const [i, cat] of categories.entries()) {
  await page.setContent(
    `<html><body style="margin:0">${await svgFor(cat, i)}</body></html>`,
  );
  await page.screenshot({
    path: join(out, `${cat[0]}.png`),
    clip: { x: 0, y: 0, width: W, height: H },
  });
  console.log(`${cat[0]}.png`);
}
await browser.close();
