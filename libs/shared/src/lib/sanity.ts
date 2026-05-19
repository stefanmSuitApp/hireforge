import { createClient, type SanityClient } from '@sanity/client';

export type SanityReadConfig = {
  projectId: string;
  dataset: string;
  apiVersion?: string;
  useCdn?: boolean;
  token?: string;
};

/**
 * Read-only Sanity client for Next.js server components / route handlers.
 * Returns `null` when `projectId` is missing (local dev without CMS yet).
 */
export function createSanityReadClient(
  config: SanityReadConfig,
): SanityClient | null {
  if (!config.projectId) {
    return null;
  }
  return createClient({
    projectId: config.projectId,
    dataset: config.dataset,
    apiVersion: config.apiVersion ?? '2024-01-01',
    useCdn: config.useCdn ?? true,
    token: config.token,
  });
}
