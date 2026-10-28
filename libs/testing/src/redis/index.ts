import { inject } from 'vitest';
import { redisUrl } from '../containers/context';

/**
 * Redis has 16 numbered databases; each test worker uses its own (the preset
 * caps workers below 16), and the setup file empties it before every file.
 */
export function testRedisDb(): number {
  return Number(process.env['VITEST_POOL_ID'] ?? '0') % 16;
}

export function testRedisUrl(): string {
  return redisUrl(inject('integration').redis, testRedisDb());
}
