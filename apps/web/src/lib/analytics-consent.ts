/**
 * Microsoft Clarity behind consent: nothing loads until the visitor accepts,
 * and only public pages and sign-up are recorded (decided 2026-10-31).
 */

export const ANALYTICS_CONSENT_COOKIE = 'hf_analytics_consent';
/** Ask again after six months. */
export const ANALYTICS_CONSENT_MAX_AGE_S = 180 * 24 * 60 * 60;
/** The footer link dispatches this to reopen the banner. */
export const OPEN_ANALYTICS_CONSENT_EVENT = 'hf:analytics-consent:open';

export type AnalyticsConsent = 'granted' | 'denied';

export function parseAnalyticsConsent(
  value: string | undefined,
): AnalyticsConsent | null {
  return value === 'granted' || value === 'denied' ? value : null;
}

/**
 * Set only in production's runtime env, so staging, e2e and dev never record.
 * Validated because it is part of the script URL.
 */
export function clarityProjectId(): string | null {
  const id = process.env.CLARITY_PROJECT_ID?.trim();
  return id && /^[a-z0-9]{6,32}$/i.test(id) ? id : null;
}

const RECORDED_PAGES = [
  /^\/$/,
  /^\/(about|employers|privacy|terms|refunds)$/,
  /^\/(companies|p)\/[^/]+$/,
  /^\/(candidate|employer)\/register$/,
];

/**
 * Locale-less paths Clarity may record. An allow-list, so a new private page
 * is never recorded by default; applying (CV, cover letter) is not.
 */
export function analyticsRecordsPath(pathname: string): boolean {
  if (pathname === '/jobs') return true;
  if (pathname.startsWith('/jobs/')) return !pathname.endsWith('/apply');
  return RECORDED_PAGES.some((re) => re.test(pathname));
}
