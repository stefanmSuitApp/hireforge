import { fetchCmsPublishedLegalPages } from '@/lib/cms-content';

/**
 * The terms version a sign-up accepts: the published terms' date, but only
 * while terms and privacy are both published (that is when the form shows
 * the notice, see SignUpLegalNotice). Never taken from the client.
 */
export async function withAcceptedTerms(body: unknown): Promise<unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const { acceptedTermsVersion: _ignored, ...rest } = body as Record<
    string,
    unknown
  >;
  const published = await fetchCmsPublishedLegalPages();
  const terms = published.find((p) => p.kind === 'terms');
  const privacy = published.some((p) => p.kind === 'privacy');
  return terms?.effectiveFrom && privacy
    ? { ...rest, acceptedTermsVersion: terms.effectiveFrom }
    : rest;
}
