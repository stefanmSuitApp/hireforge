/**
 * Same-site path to continue to after sign-in; anything else is refused.
 * Browsers read `\` as `/` and drop tabs and newlines in URLs, so `/\host`
 * and `/<tab>/host` would leave the site like `//host`.
 */
export function isSafeReturnPath(
  ret: string | null | undefined,
): ret is string {
  return (
    ret != null &&
    ret.startsWith('/') &&
    !ret.startsWith('//') &&
    // eslint-disable-next-line no-control-regex
    !/[\\\u0000-\u001f]/.test(ret)
  );
}
