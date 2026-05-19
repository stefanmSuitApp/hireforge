import { describe, expect, it } from 'vitest';
import {
  effectiveJobDescriptionHtml,
  sanitizeJobListingHtml,
} from './job-description-html';

describe('sanitizeJobListingHtml', () => {
  it('forces https anchors to include ugc + nofollow + noopener + noreferrer and target _blank', () => {
    const out = sanitizeJobListingHtml(
      '<a href="https://example.com/path">go</a>',
    );
    expect(out).toContain('rel="nofollow noopener noreferrer ugc"');
    expect(out).toContain('target="_blank"');
  });

  const sampleId = '30ff897a-bd6e-4e98-871a-69baf000ee37';

  it('rewrites absolute job-media URLs from any host to same-origin path', () => {
    const hosts = [
      `http://localhost:4000/api/public/job-description-media/${sampleId}`,
      `http://192.168.1.10:4000/api/public/job-description-media/${sampleId}`,
    ];
    for (const url of hosts) {
      expect(
        sanitizeJobListingHtml(`<p><img src="${url}" alt="x"/></p>`),
      ).toContain(`src="/api/public/job-description-media/${sampleId}"`);
    }
  });

  it('allows same-origin job media path', () => {
    const rel = `<img src="/api/public/job-description-media/${sampleId}" alt=""/>`;
    expect(sanitizeJobListingHtml(rel)).toContain(
      `src="/api/public/job-description-media/${sampleId}"`,
    );
  });

  it('keeps non-local absolute https media URLs', () => {
    const prod = `<p><img src="https://api.example.test/api/public/job-description-media/${sampleId}" alt=""/></p>`;
    expect(sanitizeJobListingHtml(prod)).toContain('src=');
    expect(
      sanitizeJobListingHtml('<img src="//evil.cdn/x"/>').includes('src='),
    ).toBe(false);
  });

  it('re-sanitizes stored-only HTML for effectiveJobDescriptionHtml (legacy localhost blob URLs)', () => {
    const stored = `<p><img src="http://127.0.0.1:4000/api/public/job-description-media/${sampleId}"/></p>`;
    const out = effectiveJobDescriptionHtml(stored, null);
    expect(out).toContain('/api/public/job-description-media/');
    expect(out).not.toContain('127.0.0.1');
    expect(out).not.toContain(':4000');
  });
});
