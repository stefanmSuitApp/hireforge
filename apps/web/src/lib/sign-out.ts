/**
 * Ends the session behind `logoutEndpoint` (a BFF route that clears the auth
 * cookies) and loads the home page in full, so the header re-renders signed
 * out. Returns false when the request could not be sent.
 */
export async function signOut(
  logoutEndpoint: string,
  locale: string,
): Promise<boolean> {
  try {
    await fetch(logoutEndpoint, { method: 'POST' });
  } catch {
    return false;
  }
  window.location.assign(`/${locale}`);
  return true;
}
