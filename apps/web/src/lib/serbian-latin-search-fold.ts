/**
 * Folds Serbian Gaj's Latin letters to ASCII equivalents so plain Latin input
 * matches text typed with diacritics (e.g. `c` matches č and ć, `s` matches š).
 *
 * Mappings: č/ć→c, š→s, ž→z, đ→d, dž→dz (including precomposed ǆ).
 * Lj and nj digraphs are intentionally not folded — matching only `l` or `n` would be too broad.
 */
export function foldSerbianLatinSearchKey(input: string): string {
  let s = input.toLowerCase().normalize('NFC');

  // Digraph dž (single glyph Ǆ/ǅ/ǆ or d + ž)
  s = s.replace(/\u01c4/g, 'dz');
  s = s.replace(/\u01c5/g, 'dz');
  s = s.replace(/\u01c6/g, 'dz');
  s = s.replace(/d\u017e/g, 'dz');

  s = s.replace(/\u0111/g, 'd'); // đ
  s = s.replace(/\u010d/g, 'c'); // č
  s = s.replace(/\u0107/g, 'c'); // ć
  s = s.replace(/\u0161/g, 's'); // š
  s = s.replace(/\u017e/g, 'z'); // ž

  return s;
}
