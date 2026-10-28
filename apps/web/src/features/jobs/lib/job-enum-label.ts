export type JobEnumKind = 'workModel' | 'employmentType' | 'seniority';

type EnumTranslator = {
  (key: string): string;
  has(key: string): boolean;
};

/**
 * Localized label for a job enum value, from the `Enums` messages (shared by
 * the public pages and the employer job form). An unknown value shows as is.
 */
export function jobEnumLabel(
  t: EnumTranslator,
  kind: JobEnumKind,
  value: string,
): string {
  const key = `${kind}.${value}`;
  return t.has(key) ? t(key) : value;
}
