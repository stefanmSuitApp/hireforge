export type CmsPortableTextBody = Array<Record<string, unknown>>;

type LocalizedBody = { sr?: CmsPortableTextBody; en?: CmsPortableTextBody };

/**
 * Editorial bodies are `{ sr, en }` since the move to project o85214ma. The old
 * project (and any rollback onto it) still stores one array for both locales,
 * so accept that too. An empty locale falls back to the other one.
 */
export function pickLocalizedBody(
  body: CmsPortableTextBody | LocalizedBody | null | undefined,
  locale: string,
): CmsPortableTextBody | null {
  if (!body) return null;
  if (Array.isArray(body)) return body.length ? body : null;
  const order = locale === 'en' ? [body.en, body.sr] : [body.sr, body.en];
  return order.find((b) => Array.isArray(b) && b.length > 0) ?? null;
}
