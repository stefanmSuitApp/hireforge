import { describe, expect, it } from 'vitest';

import {
  editorCapabilitySchema,
  entitlementsBlobSchema,
  packageCodeSchema,
  packagePriceSchema,
} from './packages';

const validEditor = {
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
  custom_html: false as const,
};

const validBlob = {
  max_active_jobs: 1,
  max_cities: 'unlimited' as const,
  max_characters: 8000,
  featured_listing: true,
  png_creative: true,
  social_publish: true,
  paid_social_ads: true,
  crossborder_visible: true,
  editor: validEditor,
  hyperlinks_max_count: 5,
};

describe('packageCodeSchema', () => {
  it('accepts the four stable codes', () => {
    for (const code of ['tezga', 'sljaka', 'sef', 'gazda']) {
      expect(packageCodeSchema.parse(code)).toBe(code);
    }
  });

  it('rejects unknown codes', () => {
    expect(packageCodeSchema.safeParse('vip').success).toBe(false);
    expect(packageCodeSchema.safeParse('').success).toBe(false);
    expect(packageCodeSchema.safeParse('TEZGA').success).toBe(false);
  });
});

describe('editorCapabilitySchema', () => {
  it('accepts a valid editor blob', () => {
    expect(editorCapabilitySchema.safeParse(validEditor).success).toBe(true);
  });

  it('rejects custom_html: true (anti-XSS pin)', () => {
    const result = editorCapabilitySchema.safeParse({
      ...validEditor,
      custom_html: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown editor capability keys', () => {
    const result = editorCapabilitySchema.safeParse({
      ...validEditor,
      god_mode: true,
    });
    expect(result.success).toBe(false);
  });
});

describe('entitlementsBlobSchema', () => {
  it('accepts a fully populated blob', () => {
    const result = entitlementsBlobSchema.safeParse(validBlob);
    expect(result.success).toBe(true);
  });

  it('accepts max_cities as integer', () => {
    const result = entitlementsBlobSchema.safeParse({
      ...validBlob,
      max_cities: 3,
    });
    expect(result.success).toBe(true);
  });

  it('rejects max_active_jobs <= 0', () => {
    const result = entitlementsBlobSchema.safeParse({
      ...validBlob,
      max_active_jobs: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown top-level keys', () => {
    const result = entitlementsBlobSchema.safeParse({
      ...validBlob,
      mystery_key: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required keys', () => {
    const { editor: _editor, ...withoutEditor } = validBlob;
    void _editor;
    const result = entitlementsBlobSchema.safeParse(withoutEditor);
    expect(result.success).toBe(false);
  });
});

describe('packagePriceSchema', () => {
  it('accepts a valid price row', () => {
    const result = packagePriceSchema.safeParse({
      packageCode: 'tezga',
      durationDays: 30,
      amountMinor: 3700,
      currency: 'EUR',
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative amount', () => {
    const result = packagePriceSchema.safeParse({
      packageCode: 'tezga',
      durationDays: 30,
      amountMinor: -1,
      currency: 'EUR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects malformed currency', () => {
    const result = packagePriceSchema.safeParse({
      packageCode: 'tezga',
      durationDays: 30,
      amountMinor: 3000,
      currency: 'EURO',
    });
    expect(result.success).toBe(false);
  });
});
