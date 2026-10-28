/** True when the error (or one of its causes) is a Postgres unique violation. */
export function isUniqueViolation(error: unknown): boolean {
  let cur: unknown = error;
  for (let i = 0; i < 10 && cur; i++) {
    if (
      typeof cur === 'object' &&
      cur !== null &&
      'code' in cur &&
      (cur as { code: unknown }).code === '23505'
    ) {
      return true;
    }
    cur =
      typeof cur === 'object' && cur !== null && 'cause' in cur
        ? (cur as { cause: unknown }).cause
        : undefined;
  }
  return false;
}
