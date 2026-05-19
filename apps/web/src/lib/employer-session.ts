/** HttpOnly cookies set by `/api/employer/auth/*` route handlers. */
export const EMPLOYER_ACCESS_COOKIE = 'hf_access';
export const EMPLOYER_REFRESH_COOKIE = 'hf_refresh';

/** Slightly under JWT access TTL (15m). */
export const EMPLOYER_ACCESS_COOKIE_MAX_AGE = 60 * 14;

export const EMPLOYER_REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 14;
