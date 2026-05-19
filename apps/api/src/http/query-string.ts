/**
 * Express `req.query` values are `string | string[] | …` (see `qs` / Express typings).
 * Nest `@Query('x')` typing often hides `string[]`; Zod `coerce.number()` then breaks (e.g. NaN).
 */
export function firstQueryString(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const f = value[0];
    return typeof f === 'string' ? f : undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}
