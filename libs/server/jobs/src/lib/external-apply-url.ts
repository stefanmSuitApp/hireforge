/**
 * Validates employer-supplied external apply URLs (HTTPS, host safety, optional allowlist).
 * Used on employer draft create/update (Step 10.2).
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  '[::1]',
  'metadata.google.internal',
]);

function parseAllowlist(): string[] {
  const raw = process.env['EXTERNAL_APPLY_HOST_ALLOWLIST'];
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

/** Returns normalized `href` (trimmed, URL canonical string). */
export function validateExternalApplyUrl(
  raw: string,
): { ok: true; href: string } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: 'External apply URL is required' };
  }

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { ok: false, message: 'Invalid URL' };
  }

  if (u.protocol !== 'https:') {
    return { ok: false, message: 'URL must use https://' };
  }

  const host = u.hostname.toLowerCase();
  if (!host) {
    return { ok: false, message: 'URL host is required' };
  }

  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.localhost')) {
    return {
      ok: false,
      message: 'This host is not allowed for external apply',
    };
  }

  const allow = parseAllowlist();
  if (allow.length > 0) {
    const allowed = allow.some(
      (rule) => host === rule || host.endsWith(`.${rule}`),
    );
    if (!allowed) {
      return {
        ok: false,
        message: 'Host is not permitted by EXTERNAL_APPLY_HOST_ALLOWLIST',
      };
    }
  }

  return { ok: true, href: u.toString() };
}
