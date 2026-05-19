import { describe, expect, it } from 'vitest';
import type { EntitlementsBlob, ProseMirrorDoc } from 'contracts';
import { entitlementsBlobFallbackTezgaBaseline } from 'contracts';
import { validateJobDraftAgainstEntitlements } from './entitlements-draft';

const baseEntitlements: EntitlementsBlob = {
  ...entitlementsBlobFallbackTezgaBaseline,
  max_cities: 'unlimited',
  hyperlinks_max_count: 3,
};

function docWithLink(params: {
  prefix: string;
  linkText: string;
  href: string;
}): ProseMirrorDoc {
  const { prefix, linkText, href } = params;
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: prefix },
          {
            type: 'text',
            marks: [
              {
                type: 'link',
                attrs: { href, target: '_blank' },
              },
            ],
            text: linkText,
          },
        ],
      },
    ],
  } as unknown as ProseMirrorDoc;
}

describe('validateJobDraftAgainstEntitlements (hyperlink guards)', () => {
  it('rejects a host that matches the blocklist (exact and subdomain)', () => {
    const description = `${'a'.repeat(55)}More info`;
    const doc = docWithLink({
      prefix: 'a'.repeat(55),
      linkText: 'More info',
      href: 'https://bit.ly/abc',
    });
    const r = validateJobDraftAgainstEntitlements(
      baseEntitlements,
      {
        description,
        descriptionDoc: doc,
        citySlug: undefined,
      },
      { linkHostBlocklist: ['bit.ly'], linkMinLeadPlainChars: 50 },
    );
    expect(r).toEqual({
      ok: false,
      violation: {
        code: 'JOB_ENTITLEMENTS_HYPERLINK_HOST_BLOCKED',
        hostname: 'bit.ly',
      },
    });

    const r2 = validateJobDraftAgainstEntitlements(
      baseEntitlements,
      {
        description,
        descriptionDoc: docWithLink({
          prefix: 'a'.repeat(55),
          linkText: 'More info',
          href: 'https://x.bit.ly/abc',
        }),
        citySlug: undefined,
      },
      { linkHostBlocklist: ['bit.ly'], linkMinLeadPlainChars: 50 },
    );
    expect(r2).toEqual({
      ok: false,
      violation: {
        code: 'JOB_ENTITLEMENTS_HYPERLINK_HOST_BLOCKED',
        hostname: 'x.bit.ly',
      },
    });
  });

  it('rejects hyperlink when fewer than minLead plain chars precede it', () => {
    const description = 'hiapply';
    const doc = docWithLink({
      prefix: 'hi',
      linkText: 'apply',
      href: 'https://example.com/jobs',
    });
    const r = validateJobDraftAgainstEntitlements(
      baseEntitlements,
      {
        description,
        descriptionDoc: doc,
        citySlug: undefined,
      },
      { linkHostBlocklist: [], linkMinLeadPlainChars: 50 },
    );
    expect(r).toEqual({
      ok: false,
      violation: {
        code: 'JOB_ENTITLEMENTS_HYPERLINK_TOO_EARLY',
        minLeadChars: 50,
        atPlainOffset: 2,
      },
    });
  });

  it('skips early-link enforcement when linkMinLeadPlainChars is 0', () => {
    const description = 'x';
    const doc = docWithLink({
      prefix: '',
      linkText: 'x',
      href: 'https://example.com/',
    });
    const r = validateJobDraftAgainstEntitlements(
      baseEntitlements,
      {
        description,
        descriptionDoc: doc,
        citySlug: undefined,
      },
      { linkHostBlocklist: [], linkMinLeadPlainChars: 0 },
    );
    expect(r).toEqual({ ok: true });
  });
});
