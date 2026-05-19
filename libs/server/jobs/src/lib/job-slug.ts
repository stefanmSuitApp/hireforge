import { randomInt } from 'node:crypto';

const SHORT_ID_LEN = 4;
const BASE_SLUG_MAX_LEN = 55;
const SHORT_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Remove Latin diacritics (Serbian Latin, etc.) for URL-safe ASCII.
 */
export function transliterateToAsciiBasic(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ß/g, 'ss')
    .normalize('NFC');
}

/**
 * Lowercase kebab segments; non-alphanumerics become single hyphens.
 */
function slugifySegment(raw: string): string {
  const s = transliterateToAsciiBasic(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s.length > 0 ? s : '';
}

export function makeShortId(): string {
  let out = '';
  for (let i = 0; i < SHORT_ID_LEN; i++) {
    out += SHORT_ID_ALPHABET[randomInt(SHORT_ID_ALPHABET.length)];
  }
  return out;
}

/**
 * Stable SEO stem from title + optional Latin city name (SSOT Step 10.1).
 * Does **not** include the short id; caller appends `-${shortId}`.
 */
export function jobSlugBaseFromTitleAndCity(
  title: string,
  cityLatin: string | null | undefined,
): string {
  const t = slugifySegment(title.trim());
  const c = cityLatin?.trim() ? slugifySegment(cityLatin) : '';
  const combined = c ? `${t}-${c}` : t;
  const stem = combined.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  if (!stem) {
    return 'job';
  }
  return stem.length > BASE_SLUG_MAX_LEN
    ? stem.slice(0, BASE_SLUG_MAX_LEN).replace(/-+$/g, '')
    : stem;
}

/** Full value for `jobs.slug` among published rows (unique partial index). */
export function buildPublishedJobFullSlug(
  title: string,
  cityLatin: string | null | undefined,
  shortId: string,
): string {
  const base = jobSlugBaseFromTitleAndCity(title, cityLatin);
  return `${base}-${shortId}`;
}
