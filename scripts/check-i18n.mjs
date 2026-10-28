#!/usr/bin/env node
/**
 * Fails on hard-coded UI text (JSX text and text attributes) and on locale
 * files that don't have the same keys. Ported from autofind-platform.
 *
 * Usage: node scripts/check-i18n.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const TEXT_ATTRIBUTES = new Set([
  'aria-label',
  'aria-description',
  'placeholder',
  'title',
  'alt',
  'label',
]);
const root = resolve(fileURLToPath(import.meta.url), '../..');
const SRC_DIRS = ['apps/web/src', 'libs/ui/src'].map((d) => join(root, d));
const LOCALES_DIR = join(root, 'apps/web/src/messages');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === 'node_modules' ? [] : walk(path);
    }
    return /\.tsx$/.test(path) && !/\.(test|spec)\.tsx$/.test(path)
      ? [path]
      : [];
  });
}

/**
 * Letters only: punctuation, digits and symbols like "·" or "→" are fine, and
 * so are HTML entities (`&rarr;`) and URL examples (`https://…`).
 */
const hasWords = (text) =>
  !/^\s*https?:\/\//.test(text) &&
  /\p{L}/u.test(text.replace(/&[a-z]+;|&#\d+;/gi, ''));

export function findHardCodedStrings(file) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found = [];
  const report = (node, text) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart());
    found.push({ line: line + 1, text: text.trim() });
  };
  (function visit(node) {
    if (ts.isJsxText(node) && hasWords(node.text)) report(node, node.text);
    if (
      ts.isJsxAttribute(node) &&
      TEXT_ATTRIBUTES.has(node.name.getText()) &&
      node.initializer
    ) {
      const init = node.initializer;
      if (ts.isStringLiteral(init) && hasWords(init.text)) {
        report(init, init.text);
      }
      if (
        ts.isJsxExpression(init) &&
        init.expression &&
        ts.isStringLiteralLike(init.expression) &&
        hasWords(init.expression.text)
      ) {
        report(init, init.expression.text);
      }
    }
    ts.forEachChild(node, visit);
  })(source);
  return found;
}

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

export function findLocaleMismatches(localesDir) {
  const files = readdirSync(localesDir).filter((f) => f.endsWith('.json'));
  const keys = Object.fromEntries(
    files.map((f) => [
      f,
      new Set(flatten(JSON.parse(readFileSync(join(localesDir, f), 'utf8')))),
    ]),
  );
  const all = new Set(Object.values(keys).flatMap((set) => [...set]));
  return files.flatMap((f) =>
    [...all]
      .filter((k) => !keys[f].has(k))
      .map(
        (k) => `${relative(root, join(localesDir, f))} is missing key "${k}"`,
      ),
  );
}

function main() {
  const problems = [
    ...SRC_DIRS.flatMap((dir) =>
      walk(dir).flatMap((file) =>
        findHardCodedStrings(file).map(
          (f) =>
            `${relative(root, file)}:${f.line} hard-coded UI text: ${JSON.stringify(f.text)}`,
        ),
      ),
    ),
    ...findLocaleMismatches(LOCALES_DIR),
  ];
  if (problems.length > 0) {
    console.error(problems.join('\n'));
    console.error(
      'check:i18n — move text into the messages files and use t().',
    );
    process.exit(1);
  }
  console.log('check:i18n — ok');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
