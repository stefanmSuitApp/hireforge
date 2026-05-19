const PROJECT_ID_ENV_KEYS = [
  'SANITY_STUDIO_PROJECT_ID',
  'NEXT_PUBLIC_SANITY_PROJECT_ID',
] as const;

const DATASET_ENV_KEYS = [
  'SANITY_STUDIO_DATASET',
  'NEXT_PUBLIC_SANITY_DATASET',
] as const;

function readFirstEnv(keys: readonly string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return '';
}

function requiredEnv(label: string, keys: readonly string[]): string {
  const value = readFirstEnv(keys);
  if (value) {
    return value;
  }
  throw new Error(
    `Missing ${label}. Set one of: ${keys.map((key) => `"${key}"`).join(', ')}`,
  );
}

export function getSanityStudioProjectId(): string {
  return requiredEnv('Sanity Studio project id', PROJECT_ID_ENV_KEYS);
}

export function getSanityStudioDataset(): string {
  return requiredEnv('Sanity Studio dataset', DATASET_ENV_KEYS);
}
