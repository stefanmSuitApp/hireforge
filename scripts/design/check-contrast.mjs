#!/usr/bin/env node
/**
 * Checks the colour token pairs the UI uses, in light and dark, against WCAG
 * 2.1: 4.5:1 for text, 3:1 for focus rings and control boundaries.
 * WARN-ONLY: always exits 0; on CI each failing pair is a `::warning::`.
 *
 * Tokens: `:root` and `.dark` in apps/web/src/app/global.css. Translucent
 * tokens are composited over the surface they sit on.
 *
 * Usage: node scripts/design/check-contrast.mjs [--md]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { contrast, cssToSrgb, over } from './color.mjs';

const root = resolve(fileURLToPath(import.meta.url), '../../..');
const TOKEN_FILE = 'apps/web/src/app/global.css';
const css = readFileSync(resolve(root, TOKEN_FILE), 'utf8');
const onCi = Boolean(process.env.CI);

function block(selector) {
  const start = css.search(
    new RegExp(`^${selector.replace('.', '\\.')} \\{`, 'm'),
  );
  if (start === -1) throw new Error(`${TOKEN_FILE} has no "${selector}" block`);
  const body = css.slice(start, css.indexOf('\n}', start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [
      m[1],
      m[2].trim(),
    ]),
  );
}

const light = block(':root');
const themes = { light, dark: { ...light, ...block('.dark') } };

const TEXT = 4.5;
const UI = 3;
// [foreground, background, minimum, where it is used, foreground alpha]
const pairs = [
  ['foreground', 'background', TEXT, 'body text'],
  ['card-foreground', 'card', TEXT, 'text on cards'],
  ['popover-foreground', 'popover', TEXT, 'menus, comboboxes'],
  ['muted-foreground', 'background', TEXT, 'secondary text'],
  ['muted-foreground', 'card', TEXT, 'secondary text on cards'],
  ['muted-foreground', 'muted', TEXT, 'secondary text on muted panels'],
  ['primary', 'background', TEXT, 'links, primary text'],
  ['primary', 'card', TEXT, 'links on cards'],
  ['primary-foreground', 'primary', TEXT, 'primary button label'],
  ['secondary-foreground', 'secondary', TEXT, 'secondary button label'],
  ['accent-foreground', 'accent', TEXT, 'hover/selected rows, chips'],
  ['destructive', 'background', TEXT, 'error text'],
  ['destructive-foreground', 'destructive', TEXT, 'destructive button label'],
  ['ring', 'background', UI, 'focus ring'],
  ['ring', 'card', UI, 'focus ring on cards'],
  ['input', 'background', UI, 'input outlines'],
  ['input', 'card', UI, 'input outlines on cards'],
];

const rows = [];
for (const [theme, tokens] of Object.entries(themes)) {
  const color = (name) => {
    const c = tokens[name] && cssToSrgb(tokens[name]);
    if (!c)
      throw new Error(`${theme}: token --${name} missing or not oklch/hex`);
    return c;
  };
  for (const [fg, bg, min, use] of pairs) {
    const surface = over(color(bg), cssToSrgb('#ffffff'));
    const r = contrast(over(color(fg), surface), surface);
    rows.push({ theme, fg, bg, r, min, use, ok: r >= min });
  }
}

if (process.argv.includes('--md')) {
  console.log('| Theme | Foreground | Background | Ratio | Needs | Used for |');
  console.log('|---|---|---|---|---|---|');
  for (const x of rows) {
    console.log(
      `| ${x.theme} | \`${x.fg}\` | \`${x.bg}\` | ${x.r.toFixed(2)} | ${x.min} | ${x.use} |`,
    );
  }
} else {
  for (const x of rows) {
    const line = `${x.theme.padEnd(5)} ${x.fg.padEnd(22)} on ${x.bg.padEnd(12)} ${x.r.toFixed(2).padStart(5)} (≥ ${x.min})  ${x.use}`;
    if (!x.ok && onCi) {
      console.log(`::warning file=${TOKEN_FILE}::check:contrast ${line}`);
    } else {
      console.log(`${x.ok ? 'ok  ' : 'LOW '} ${line}`);
    }
  }
}
const failed = rows.filter((x) => !x.ok).length;
console.log(
  failed
    ? `check:contrast — ${failed} of ${rows.length} pairs below WCAG AA (warning only)`
    : `check:contrast — all ${rows.length} pairs pass`,
);
