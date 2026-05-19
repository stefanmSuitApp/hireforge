// Maps glyphs that NFD does not decompose (e.g. U+0111 LATIN SMALL LETTER D
// WITH STROKE has no canonical decomposition, so we expand it explicitly to
// `dj` before normalizing).
const EXPLICIT_MAP: Record<string, string> = {
  đ: 'dj',
  Đ: 'Dj',
};

export interface ToAsciiSlugOptions {
  maxLength?: number;
}

/**
 * Convert a Latin (incl. Serbian-Latin) string to an ASCII URL slug.
 *
 * Rules:
 *  - đ/Đ are expanded to `dj`/`Dj` before normalization (no canonical NFD).
 *  - š, ć, č, ž (and other diacritics) are stripped via NFD + combining-mark removal.
 *  - Non-Latin scripts (e.g. Cyrillic) are dropped — Sljakam MVP is Latin-only
 *    for slugs (see PRODUCT_SSOT_SLJAKAM.md §13.1 and brand split rule §1.1.1).
 *  - Result is lower-cased, kebab-cased, with any leading/trailing or
 *    consecutive dashes collapsed.
 *  - Truncated to `maxLength` (default 60) without leaving a trailing dash.
 */
export function toAsciiSlug(
  input: string,
  options: ToAsciiSlugOptions = {},
): string {
  const max = options.maxLength ?? 60;
  if (!input) return '';

  let work = input;
  for (const [from, to] of Object.entries(EXPLICIT_MAP)) {
    // split/join is used instead of String.prototype.replaceAll because the
    // shared library's tsconfig targets `lib: es2020` (replaceAll lands in es2021).
    work = work.split(from).join(to);
  }

  work = work.normalize('NFD').replace(/\p{M}/gu, '');

  work = work
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  return work.slice(0, max).replace(/-+$/, '');
}
