import { afterEach, describe, expect, it } from 'vitest';
import { validateExternalApplyUrl } from './external-apply-url';

afterEach(() => {
  delete process.env['EXTERNAL_APPLY_HOST_ALLOWLIST'];
});

describe('external apply URLs', () => {
  it('accept an https URL and return it canonical', () => {
    expect(
      validateExternalApplyUrl('  https://Karijere.Firma.rs/posao?id=1 '),
    ).toEqual({
      ok: true,
      href: 'https://karijere.firma.rs/posao?id=1',
    });
  });

  it.each([
    ['', 'External apply URL is required'],
    ['not a url', 'Invalid URL'],
    ['http://firma.rs/posao', 'URL must use https://'],
    ['javascript:alert(1)', 'URL must use https://'],
    ['https://localhost/x', 'This host is not allowed for external apply'],
    ['https://127.0.0.1/x', 'This host is not allowed for external apply'],
    ['https://[::1]/x', 'This host is not allowed for external apply'],
    ['https://app.localhost/x', 'This host is not allowed for external apply'],
    [
      'https://metadata.google.internal/',
      'This host is not allowed for external apply',
    ],
  ])('refuse %j', (url, message) => {
    expect(validateExternalApplyUrl(url)).toEqual({ ok: false, message });
  });

  it('with an allowlist, accept only listed hosts and their subdomains', () => {
    process.env['EXTERNAL_APPLY_HOST_ALLOWLIST'] =
      'firma.rs, , Jobs.Example.com';
    expect(validateExternalApplyUrl('https://firma.rs/a').ok).toBe(true);
    expect(validateExternalApplyUrl('https://karijere.firma.rs/a').ok).toBe(
      true,
    );
    expect(validateExternalApplyUrl('https://jobs.example.com/a').ok).toBe(
      true,
    );
    expect(validateExternalApplyUrl('https://evilfirma.rs/a')).toEqual({
      ok: false,
      message: 'Host is not permitted by EXTERNAL_APPLY_HOST_ALLOWLIST',
    });
  });
});
