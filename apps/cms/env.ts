// The Studio build only inlines `process.env.SANITY_STUDIO_*` written out in
// full: a computed `process.env[key]` compiles to `{}[key]` in the browser
// bundle, and other prefixes (NEXT_PUBLIC_*) never reach it.

function required(label: string, name: string, value: string | undefined) {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }
  throw new Error(`Missing ${label}. Set "${name}".`);
}

export function getSanityStudioProjectId(): string {
  return required(
    'Sanity Studio project id',
    'SANITY_STUDIO_PROJECT_ID',
    process.env.SANITY_STUDIO_PROJECT_ID,
  );
}

export function getSanityStudioDataset(): string {
  return required(
    'Sanity Studio dataset',
    'SANITY_STUDIO_DATASET',
    process.env.SANITY_STUDIO_DATASET,
  );
}
