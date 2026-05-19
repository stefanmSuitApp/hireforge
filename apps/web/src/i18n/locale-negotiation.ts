/** Pick best supported locale from `Accept-Language`, else default. */
export function pickLocaleFromAcceptLanguage(
  header: string | null,
  supportedLocales: readonly string[],
  defaultLocale: string,
): string {
  if (!header?.trim()) {
    return defaultLocale;
  }

  const parsed = header.split(',').map((raw) => {
    const [tagPart, ...params] = raw.trim().split(';');
    const tag = tagPart.trim().toLowerCase();
    let q = 1;
    for (const p of params) {
      const [k, v] = p.split('=').map((s) => s.trim());
      if (k === 'q') {
        const n = parseFloat(v);
        if (Number.isFinite(n)) {
          q = n;
        }
      }
    }
    return { tag, q };
  });
  parsed.sort((a, b) => b.q - a.q);

  for (const { tag } of parsed) {
    const primary = tag.split('-')[0];
    if (supportedLocales.includes(primary)) {
      return primary;
    }
  }

  return defaultLocale;
}
