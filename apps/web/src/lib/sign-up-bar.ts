import { readRecentJobRefs } from './recently-viewed-jobs';

const DISMISSED_KEY = 'hf:signUpBar:dismissed:v1';
/** Distinct job pages a guest has opened before the bar appears. */
export const SIGN_UP_BAR_AFTER_VIEWS = 3;

/**
 * Locale-less paths where the bar would get in the way: the auth and apply
 * pages, and a job page on a phone, which has its own sticky apply bar.
 */
export function signUpBarPlacement(
  pathname: string,
): 'none' | 'desktop' | 'all' {
  if (
    /^\/(sign-in|forgot-password|reset-password|verify-email)(\/|$)/.test(
      pathname,
    ) ||
    /^\/(candidate|employer|moderator)\/(login|register)(\/|$)/.test(
      pathname,
    ) ||
    /^\/jobs\/[^/]+\/apply$/.test(pathname)
  ) {
    return 'none';
  }
  return /^\/jobs\/[^/]+$/.test(pathname) ? 'desktop' : 'all';
}

export function signUpBarDue(): boolean {
  try {
    if (globalThis.localStorage?.getItem(DISMISSED_KEY)) return false;
  } catch {
    return false;
  }
  return readRecentJobRefs().length >= SIGN_UP_BAR_AFTER_VIEWS;
}

/** Dismissed, or no longer a guest: never show it again in this browser. */
export function retireSignUpBar(): void {
  try {
    globalThis.localStorage?.setItem(DISMISSED_KEY, '1');
  } catch {
    /* private mode: it may come back, which is harmless */
  }
}
