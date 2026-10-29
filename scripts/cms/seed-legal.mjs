#!/usr/bin/env node
/**
 * Loads the legal drafts from `docs/legal/<kind>.<locale>.md` into Sanity as
 * UNPUBLISHED drafts (`drafts.legal-<kind>`). Nothing reaches the site until
 * someone reads the draft in Studio and presses Publish.
 *
 * Never overwrites: a kind that already has a draft or a published document
 * is skipped, so edits made in Studio are safe.
 *
 * Usage: pnpm cms:seed:legal [--dry-run]
 * Needs SANITY_PROJECT_ID, SANITY_DATASET and SANITY_API_WRITE_TOKEN (.env);
 * --dry-run only converts and prints, without a token.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@sanity/client';
import { config } from 'dotenv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
config({ path: join(root, '.env') });

const KINDS = ['privacy', 'terms', 'refunds'];
/** Placeholder; set the real date in Studio when publishing. */
const EFFECTIVE_FROM = '2026-10-29';

const REFUND_SUMMARY = {
  sr: 'Neplaćen predračun ističe posle 14 dana. Ako ne odobrimo oglas, a nijedan oglas iz paketa nije objavljen, vraćamo ceo iznos paketa. Posle objave oglasa nema srazmernog povraćaja. Ceo tekst: sljakam.com/sr/refunds',
  en: 'An unpaid proforma expires after 14 days. If we do not approve your ad and no ad from the package has been published, we refund the full price. Once an ad is published there is no pro-rata refund. Full policy: sljakam.com/en/refunds',
};

let keySeq = 0;
const key = () => `k${(keySeq++).toString(36)}`;

/** `**bold**`, `[text](url)` and `` `code` `` (kept as plain text). */
function spans(text) {
  const children = [];
  const markDefs = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) children.push({ text: text.slice(last, m.index) });
    if (m[1] !== undefined) {
      children.push({ text: m[1], marks: ['strong'] });
    } else {
      const _key = key();
      markDefs.push({ _type: 'link', _key, href: m[3] });
      children.push({ text: m[2], marks: [_key] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) children.push({ text: text.slice(last) });
  return {
    markDefs,
    children: children.map((c) => ({
      _type: 'span',
      _key: key(),
      text: c.text.replaceAll('`', ''),
      marks: c.marks ?? [],
    })),
  };
}

function block(text, style = 'normal', listItem) {
  return {
    _type: 'block',
    _key: key(),
    style,
    ...(listItem ? { listItem, level: 1 } : {}),
    ...spans(text),
  };
}

/** The small Markdown subset the drafts use: `#`, `##`, `###`, `- `, paragraphs. */
function markdownToPortableText(md) {
  let title = '';
  const blocks = [];
  let paragraph = [];
  const flush = () => {
    if (paragraph.length) blocks.push(block(paragraph.join(' ')));
    paragraph = [];
  };
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    const list = /^\s*- (.*)$/.exec(line);
    if (!line.trim()) flush();
    else if (line.startsWith('# ')) title = line.slice(2).trim();
    else if (line.startsWith('### '))
      (flush(), blocks.push(block(line.slice(4), 'h3')));
    else if (line.startsWith('## '))
      (flush(), blocks.push(block(line.slice(3), 'h2')));
    else if (list) (flush(), blocks.push(block(list[1], 'normal', 'bullet')));
    else paragraph.push(line.trim());
  }
  flush();
  return { title, blocks };
}

function legalDoc(kind) {
  const read = (locale) =>
    markdownToPortableText(
      readFileSync(join(root, 'docs', 'legal', `${kind}.${locale}.md`), 'utf8'),
    );
  const sr = read('sr');
  const en = read('en');
  return {
    _id: `drafts.legal-${kind}`,
    _type: 'legalPage',
    title: { _type: 'localeString', sr: sr.title, en: en.title },
    effectiveFrom: EFFECTIVE_FROM,
    ...(kind === 'refunds'
      ? { summary: { _type: 'localeText', ...REFUND_SUMMARY } }
      : {}),
    body: { _type: 'localeBlockContent', sr: sr.blocks, en: en.blocks },
  };
}

async function main() {
  const docs = KINDS.map(legalDoc);
  if (process.argv.includes('--dry-run')) {
    for (const d of docs) {
      console.log(
        `${d._id}: "${d.title.sr}" / "${d.title.en}", ${d.body.sr.length} sr + ${d.body.en.length} en blocks`,
      );
    }
    return;
  }

  const projectId =
    process.env.SANITY_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset =
    process.env.SANITY_DATASET?.trim() ||
    process.env.NEXT_PUBLIC_SANITY_DATASET?.trim();
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!projectId || !dataset || !token) {
    throw new Error(
      '[hireforge] Need SANITY_PROJECT_ID, SANITY_DATASET and SANITY_API_WRITE_TOKEN.',
    );
  }
  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    token,
    useCdn: false,
  });

  for (const doc of docs) {
    const published = doc._id.replace(/^drafts\./, '');
    const existing = await client.fetch(`count(*[_id in [$a, $b]])`, {
      a: doc._id,
      b: published,
    });
    if (existing > 0) {
      console.log(`skip ${published}: already in Sanity`);
      continue;
    }
    await client.create(doc);
    console.log(`created draft ${doc._id} (${projectId}/${dataset})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
