/** The one "now" every test runs at, unless E2E_NOW overrides it (ISO 8601, UTC). */
export const FIXED_NOW = new Date('2026-01-15T10:00:00.000Z');

export function fixedNow(
  env: Record<string, string | undefined> = process.env,
): Date {
  const raw = env['E2E_NOW'];
  if (!raw) return FIXED_NOW;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`E2E_NOW is not a valid ISO date: ${raw}`);
  }
  return parsed;
}
