/** HttpOnly cookies set by `/api/moderator/auth/*` (moderator / admin staff). */
export const STAFF_ACCESS_COOKIE = 'hf_staff_access';
export const STAFF_REFRESH_COOKIE = 'hf_staff_refresh';

export const STAFF_ACCESS_COOKIE_MAX_AGE = 60 * 14;
export const STAFF_REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 14;
