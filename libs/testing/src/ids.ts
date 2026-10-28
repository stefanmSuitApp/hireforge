import { createHash } from 'node:crypto';

/**
 * Deterministic UUID for test data: the same (kind, n) gives the same id on
 * every run and machine. v4-shaped so Postgres `uuid` and Zod `.uuid()` accept it.
 */
export function testId(kind: string, n: number): string {
  const hex = createHash('sha256')
    .update(`hireforge-test:${kind}:${n}`)
    .digest('hex');
  const variant = ((parseInt(hex[16] ?? '0', 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
