#!/usr/bin/env node
/**
 * Reports colour and size values that bypass the design tokens. WARN-ONLY:
 * always exits 0; on CI each finding is a `::warning::` annotation.
 *
 * Source of truth: the CSS variables in apps/web/src/app/global.css
 * (`:root` + `.dark`, exposed to Tailwind via `@theme inline`). Components
 * should use token utilities (`bg-primary`, `text-muted-foreground`, …), not
 * raw colours, Tailwind's fixed palette (`text-gray-900`) or arbitrary values.
 *
 * Usage: node scripts/design/check-design.mjs [--list]
 *   --list  print every finding, not only the per-file summary
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '../../..');
const DIRS = ['apps/web/src', 'libs/ui/src'];
const TOKEN_FILE = 'apps/web/src/app/global.css';
const onCi = Boolean(process.env.CI);

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const RULES = [
  ['raw hex colour', /#[0-9a-f]{3,4}\b|#[0-9a-f]{6}\b|#[0-9a-f]{8}\b/gi],
  ['raw rgb/hsl/oklch colour', /\b(?:rgba?|hsla?|oklch|oklab|lch|lab|hwb)\(/g],
  [
    'Tailwind palette colour instead of a token',
    new RegExp(
      `\\b(?:text|bg|border|ring|outline|from|via|to|fill|stroke|divide|placeholder|decoration|shadow)-(?:${PALETTE})-\\d{2,3}\\b`,
      'g',
    ),
  ],
  ['arbitrary Tailwind colour', /-\[(?:color:)?(?:#|rgb|hsl|oklch)/g],
  [
    'arbitrary Tailwind size',
    /\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|w|h|min-w|min-h|max-w|max-h|top|left|right|bottom|text|rounded)-\[[\d.]+(?:px|rem|em)\]/g,
  ],
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === 'node_modules' ? [] : walk(path);
    }
    return /\.(tsx?|css)$/.test(name) && !/\.(test|spec)\./.test(name)
      ? [path]
      : [];
  });
}

const findings = [];
for (const dir of DIRS) {
  for (const file of walk(join(root, dir))) {
    const rel = relative(root, file);
    if (rel === TOKEN_FILE) continue;
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((text, i) => {
        for (const [label, re] of RULES) {
          for (const m of text.matchAll(re)) {
            findings.push({ file: rel, line: i + 1, label, value: m[0] });
          }
        }
      });
  }
}

const byFile = new Map();
for (const f of findings) byFile.set(f.file, (byFile.get(f.file) ?? 0) + 1);

if (process.argv.includes('--list') || onCi) {
  for (const f of findings) {
    const msg = `${f.label}: ${f.value}`;
    console.log(
      onCi
        ? `::warning file=${f.file},line=${f.line}::check:design ${msg}`
        : `${f.file}:${f.line} ${msg}`,
    );
  }
}
const top = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
for (const [file, n] of top) console.log(`${String(n).padStart(4)}  ${file}`);
console.log(
  findings.length
    ? `check:design — ${findings.length} values outside the tokens in ${byFile.size} files (warning only; see ${TOKEN_FILE})`
    : 'check:design — ok',
);
