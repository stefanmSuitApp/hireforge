/** HttpOnly cookies set by `/api/candidate/auth/*` route handlers. */
export const CANDIDATE_ACCESS_COOKIE = 'hf_candidate_access';
export const CANDIDATE_REFRESH_COOKIE = 'hf_candidate_refresh';

/** Slightly under JWT access TTL (15m). */
export const CANDIDATE_ACCESS_COOKIE_MAX_AGE = 60 * 14;

export const CANDIDATE_REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 14;
