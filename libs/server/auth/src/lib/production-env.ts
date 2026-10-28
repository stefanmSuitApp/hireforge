/**
 * Startup guard for production processes: refuse to boot with dev-only switches
 * enabled or with secrets still set to the placeholders shipped in
 * `.env.example` / `deploy/env.production.example`.
 */

/** Substrings that only appear in placeholder or dev-fallback secret values. */
const PLACEHOLDER_MARKERS = [
  'replace-with',
  'change-me',
  'changeme',
  'dev-insecure',
  'example',
] as const;

/** Secrets that must be real when set; `AUTH_JWT_SECRET` must also be present. */
const GUARDED_SECRETS = [
  'AUTH_JWT_SECRET',
  'CMS_SYNC_SECRET',
  'SANITY_WEBHOOK_SECRET',
] as const;

const MIN_SECRET_LENGTH = 32;

type Env = Record<string, string | undefined>;

export function looksLikePlaceholderSecret(value: string): boolean {
  const v = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => v.includes(marker));
}

/** Returns human-readable problems; empty when the env is safe to boot (or not production). */
export function findProductionEnvProblems(env: Env): string[] {
  if (env['NODE_ENV'] !== 'production') {
    return [];
  }
  const problems: string[] = [];

  if (env['AUTH_DEV_HEADERS'] === '1') {
    problems.push(
      'AUTH_DEV_HEADERS=1 enables user impersonation and is not allowed in production',
    );
  }

  for (const key of GUARDED_SECRETS) {
    const value = env[key]?.trim() ?? '';
    if (!value) {
      if (key === 'AUTH_JWT_SECRET') {
        problems.push(`${key} must be set in production`);
      }
      continue;
    }
    if (value.length < MIN_SECRET_LENGTH) {
      problems.push(`${key} must be at least ${MIN_SECRET_LENGTH} characters`);
    }
    if (looksLikePlaceholderSecret(value)) {
      problems.push(`${key} still contains a placeholder value`);
    }
  }

  return problems;
}

/** Throws (crashing the process at boot) when `findProductionEnvProblems` reports anything. */
export function assertProductionEnv(env: Env = process.env): void {
  const problems = findProductionEnvProblems(env);
  if (problems.length > 0) {
    throw new Error(
      `Refusing to start with unsafe production config:\n- ${problems.join('\n- ')}`,
    );
  }
}
