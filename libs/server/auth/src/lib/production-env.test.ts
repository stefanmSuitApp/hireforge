import { describe, expect, it } from 'vitest';
import {
  assertProductionEnv,
  findProductionEnvProblems,
} from './production-env';

const REAL_SECRET = 'k3J9xQ2mV8pL5wR1tY7uZ4aB6cD0eF2gH9iJ';

describe('findProductionEnvProblems', () => {
  it('ignores non-production environments', () => {
    expect(
      findProductionEnvProblems({
        NODE_ENV: 'development',
        AUTH_DEV_HEADERS: '1',
        AUTH_JWT_SECRET: 'replace-with-a-long-random-jwt-secret-min-32-chars',
      }),
    ).toEqual([]);
  });

  it('accepts a production env with real secrets', () => {
    expect(
      findProductionEnvProblems({
        NODE_ENV: 'production',
        AUTH_DEV_HEADERS: '0',
        AUTH_JWT_SECRET: REAL_SECRET,
        CMS_SYNC_SECRET: REAL_SECRET + 'a',
      }),
    ).toEqual([]);
  });

  it('rejects dev impersonation headers in production', () => {
    expect(
      findProductionEnvProblems({
        NODE_ENV: 'production',
        AUTH_DEV_HEADERS: '1',
        AUTH_JWT_SECRET: REAL_SECRET,
      }),
    ).toEqual([
      'AUTH_DEV_HEADERS=1 enables user impersonation and is not allowed in production',
    ]);
  });

  it('rejects the shipped placeholder JWT secret even though it is long enough', () => {
    expect(
      findProductionEnvProblems({
        NODE_ENV: 'production',
        AUTH_JWT_SECRET: 'replace-with-a-long-random-jwt-secret-min-32-chars',
      }),
    ).toEqual(['AUTH_JWT_SECRET still contains a placeholder value']);
  });

  it('requires a JWT secret and flags short or placeholder optional secrets', () => {
    expect(
      findProductionEnvProblems({
        NODE_ENV: 'production',
        CMS_SYNC_SECRET: 'short',
        SANITY_WEBHOOK_SECRET:
          'replace-with-a-long-random-sanity-webhook-secret',
      }),
    ).toEqual([
      'AUTH_JWT_SECRET must be set in production',
      'CMS_SYNC_SECRET must be at least 32 characters',
      'SANITY_WEBHOOK_SECRET still contains a placeholder value',
    ]);
  });
});

describe('assertProductionEnv', () => {
  it('throws with every problem listed', () => {
    expect(() =>
      assertProductionEnv({ NODE_ENV: 'production', AUTH_DEV_HEADERS: '1' }),
    ).toThrow(/AUTH_DEV_HEADERS=1[\s\S]*AUTH_JWT_SECRET must be set/);
  });
});
