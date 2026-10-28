// T5.2 every entitlement rule a draft is checked against (SSOT §6.3).
import { describe, expect, it } from 'vitest';
import type { EntitlementsBlob, ProseMirrorDoc } from 'contracts';
import { entitlementsBlobFallbackTezgaBaseline } from 'contracts';
import { validateJobDraftAgainstEntitlements } from './entitlements-draft';

const ALL_EDITOR = {
  bold: true,
  italic: true,
  underline: true,
  headings: true,
  lists: true,
  blockquote: true,
  inline_code: true,
  code_block: true,
  text_align: true,
  image_upload: true,
  embed: true,
  hyperlinks: true,
  custom_html: false,
} as const;
const sef: EntitlementsBlob = {
  ...entitlementsBlobFallbackTezgaBaseline,
  max_characters: 8000,
  max_cities: 'unlimited',
  featured_listing: true,
  crossborder_visible: true,
  png_creative: true,
  hyperlinks_max_count: 5,
  editor: { ...ALL_EDITOR },
};
const tezga: EntitlementsBlob = {
  ...entitlementsBlobFallbackTezgaBaseline,
  max_cities: 1,
};
const doc = (...content: unknown[]) =>
  ({ type: 'doc', content }) as unknown as ProseMirrorDoc;
const text = (t: string, marks: unknown[] = []) => ({
  type: 'text',
  text: t,
  marks,
});
const para = (...content: unknown[]) => ({ type: 'paragraph', content });
const lead = 'x'.repeat(60);
const base = { description: 'Opis', descriptionDoc: null, citySlug: 'beograd' };
const check = (
  ent: EntitlementsBlob,
  input: Partial<Parameters<typeof validateJobDraftAgainstEntitlements>[1]>,
  opts = {},
) => validateJobDraftAgainstEntitlements(ent, { ...base, ...input }, opts);
const code = (r: ReturnType<typeof validateJobDraftAgainstEntitlements>) =>
  r.ok ? 'ok' : r.violation.code;

describe('length and paid perks', () => {
  it('a description over the package limit is refused with max and actual', () => {
    const r = check(tezga, {
      description: 'x'.repeat(tezga.max_characters + 1),
    });
    expect(r).toEqual({
      ok: false,
      violation: {
        code: 'JOB_ENTITLEMENTS_DESCRIPTION_LENGTH',
        max: tezga.max_characters,
        actual: tezga.max_characters + 1,
      },
    });
  });

  it.each([
    ['featured', { featured: true }, 'JOB_ENTITLEMENTS_FEATURED_FORBIDDEN'],
    [
      'cross-border',
      { crossborderVisible: true },
      'JOB_ENTITLEMENTS_CROSSBORDER_FORBIDDEN',
    ],
    [
      'PNG creative',
      { pngCreativeUrl: 'https://cdn.firma.rs/a.png' },
      'JOB_ENTITLEMENTS_PNG_CREATIVE_FORBIDDEN',
    ],
  ] as const)('%s needs a package that includes it', (_, input, violation) => {
    expect(code(check(tezga, input))).toBe(violation);
    expect(code(check(sef, input))).toBe('ok');
  });

  it('an empty PNG creative URL is not a perk', () => {
    expect(code(check(tezga, { pngCreativeUrl: '   ' }))).toBe('ok');
  });

  it('a package with a city limit needs a city; unlimited ones do not', () => {
    expect(code(check(tezga, { citySlug: ' ' }))).toBe(
      'JOB_ENTITLEMENTS_CITY_REQUIRED',
    );
    expect(code(check(sef, { citySlug: undefined }))).toBe('ok');
  });
});

describe('links', () => {
  const linkDoc = (...hrefs: string[]) =>
    doc(
      para(
        text(lead),
        ...hrefs.map((href) =>
          text('link', [{ type: 'link', attrs: { href } }]),
        ),
      ),
    );

  it('a package without hyperlinks refuses any link', () => {
    const noLinks = { ...sef, editor: { ...ALL_EDITOR, hyperlinks: false } };
    expect(
      code(check(noLinks, { descriptionDoc: linkDoc('https://firma.rs') })),
    ).toBe('JOB_ENTITLEMENTS_HYPERLINK_FORBIDDEN');
  });

  it('more links than the package allows is refused with the counts', () => {
    const r = check(
      tezga,
      { descriptionDoc: linkDoc('https://a.rs', 'https://b.rs') },
      { linkMinLeadPlainChars: 0 },
    );
    expect(r).toEqual({
      ok: false,
      violation: {
        code: 'JOB_ENTITLEMENTS_HYPERLINK_COUNT',
        max: 1,
        actual: 2,
      },
    });
  });

  it('only https links are allowed', () => {
    const r = check(sef, { descriptionDoc: linkDoc('http://firma.rs') });
    expect(r).toEqual({
      ok: false,
      violation: {
        code: 'JOB_ENTITLEMENTS_HYPERLINK_HTTPS',
        href: 'http://firma.rs',
      },
    });
  });

  it('a link that is not a URL is refused when a blocklist is checked', () => {
    expect(
      code(
        check(
          sef,
          { descriptionDoc: linkDoc('https://') },
          { linkHostBlocklist: ['bit.ly'] },
        ),
      ),
    ).toBe('JOB_ENTITLEMENTS_HYPERLINK_HTTPS');
  });

  it('a link mark without an href is ignored', () => {
    const d = doc(
      para(
        text(lead),
        text('x', [{ type: 'link', attrs: {} }]),
        text('y', ['not a mark']),
      ),
    );
    expect(code(check(sef, { descriptionDoc: d }))).toBe('ok');
  });
});

describe('editor capabilities', () => {
  const caps = (off: keyof typeof ALL_EDITOR) => ({
    ...sef,
    editor: { ...ALL_EDITOR, [off]: false },
  });
  const cases: Array<[keyof typeof ALL_EDITOR, unknown]> = [
    [
      'headings',
      { type: 'heading', attrs: { level: 2 }, content: [text('H')] },
    ],
    ['lists', { type: 'bulletList', content: [] }],
    ['lists', { type: 'orderedList', content: [] }],
    ['blockquote', { type: 'blockquote', content: [] }],
    ['code_block', { type: 'codeBlock', content: [] }],
    ['image_upload', { type: 'image', attrs: { src: 'https://a.rs/a.png' } }],
    [
      'text_align',
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: [text('x')],
      },
    ],
    ['bold', para(text('x', [{ type: 'bold' }]))],
    ['italic', para(text('x', [{ type: 'italic' }]))],
    ['underline', para(text('x', [{ type: 'underline' }]))],
    ['inline_code', para(text('x', [{ type: 'code' }]))],
  ];

  for (const [cap, node] of cases) {
    it(`${cap} off: a document using it is refused with its path`, () => {
      const r = check(caps(cap), { descriptionDoc: doc(node) });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.violation.code).toBe('JOB_ENTITLEMENTS_EDITOR');
        expect(r.violation).toMatchObject({
          detail: expect.stringContaining(cap),
        });
      }
      expect(code(check(sef, { descriptionDoc: doc(node) }))).toBe('ok');
    });
  }

  it('left alignment is always allowed', () => {
    const r = check(caps('text_align'), {
      descriptionDoc: doc({
        type: 'paragraph',
        attrs: { textAlign: 'left' },
        content: [text('x')],
      }),
    });
    expect(code(r)).toBe('ok');
  });
});
