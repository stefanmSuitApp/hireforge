// T5.2 mapping a Sanity package document into the price / entitlement mirror:
// what the CMS sends decides what employers pay, so bad data must fail loudly.
import { describe, expect, it } from 'vitest';
import { mapSanityPackageDefinitionDoc } from './map-sanity-package';

const EDITOR = {
  bold: true,
  italic: true,
  underline: false,
  headings: true,
  lists: true,
  blockquote: false,
  inline_code: false,
  code_block: false,
  text_align: false,
  image_upload: false,
  embed: false,
  hyperlinks: true,
};
const DOC = {
  _id: ' packageDefinition.sljaka ',
  _type: 'packageDefinition',
  code: ' sljaka ',
  isActive: true,
  isEnterprise: false,
  displayOrder: 2,
  titleSr: ' ŠLJAKA ',
  titleEn: '',
  marketingDescriptionSr: 'Za male firme',
  prices: [
    { durationDays: 15, amountMinor: 4000, currency: 'eur' },
    { durationDays: 30, amountMinor: 4700, currency: 'EUR' },
  ],
  entitlements: {
    maxActiveJobs: 1,
    maxCitiesUnlimited: false,
    maxCitiesCount: 3,
    maxCharacters: 4000,
    featuredListing: false,
    pngCreative: false,
    socialPublish: true,
    paidSocialAds: false,
    crossborderVisible: false,
    hyperlinksMaxCount: 3,
    editor: EDITOR,
  },
  upgradeMessages: [
    {
      featureKey: ' featured_listing ',
      messageSr: ' Nadogradite na ŠEF ',
      messageEn: '  ',
    },
  ],
};

const without = (key: string) =>
  Object.fromEntries(Object.entries(DOC).filter(([k]) => k !== key));

describe('mapSanityPackageDefinitionDoc', () => {
  it('maps a full document: trimmed ids, upper-case currencies, snake_case entitlements', () => {
    const out = mapSanityPackageDefinitionDoc(DOC);
    expect(out).toMatchObject({
      cmsRef: 'packageDefinition.sljaka',
      code: 'sljaka',
      isActive: true,
      isEnterprise: false,
      displayOrder: 2,
      titleSr: 'ŠLJAKA',
      titleEn: null,
      marketingDescriptionSr: 'Za male firme',
      marketingDescriptionEn: null,
      prices: [
        { durationDays: 15, amountMinor: 4000, currency: 'EUR' },
        { durationDays: 30, amountMinor: 4700, currency: 'EUR' },
      ],
      upgradeMessages: [
        { featureKey: 'featured_listing', messageSr: 'Nadogradite na ŠEF' },
      ],
    });
    expect(out.entitlements).toMatchObject({
      max_active_jobs: 1,
      max_cities: 3,
      max_characters: 4000,
      social_publish: true,
      hyperlinks_max_count: 3,
      editor: { ...EDITOR, custom_html: false },
    });
  });

  it('unlimited cities, no display order and no upgrade messages are allowed', () => {
    const out = mapSanityPackageDefinitionDoc({
      ...without('upgradeMessages'),
      displayOrder: null,
      entitlements: {
        ...DOC.entitlements,
        maxCitiesUnlimited: true,
        maxCitiesCount: undefined,
      },
    });
    expect(out.entitlements.max_cities).toBe('unlimited');
    expect(out.displayOrder).toBeNull();
    expect(out.upgradeMessages).toBeUndefined();
  });

  it('custom HTML is never enabled, whatever the CMS says', () => {
    const out = mapSanityPackageDefinitionDoc({
      ...DOC,
      entitlements: {
        ...DOC.entitlements,
        editor: { ...EDITOR, custom_html: true },
      },
    });
    expect(out.entitlements.editor.custom_html).toBe(false);
  });

  it.each([
    ['not an object', 'x', /expected object/],
    ['no _id', without('_id'), /missing _id/],
    ['a blank _id', { ...DOC, _id: '  ' }, /missing _id/],
    [
      'another document type',
      { ...DOC, _type: 'page' },
      /expected _type packageDefinition, got page/,
    ],
    ['no code', { ...DOC, code: ' ' }, /code required/],
    ['prices not a list', { ...DOC, prices: {} }, /prices must be an array/],
    [
      'a price without a number',
      {
        ...DOC,
        prices: [{ durationDays: '30', amountMinor: 1, currency: 'EUR' }],
      },
      /prices\[0\]\.durationDays must be a number/,
    ],
    [
      'an infinite price',
      {
        ...DOC,
        prices: [{ durationDays: 30, amountMinor: Infinity, currency: 'EUR' }],
      },
      /amountMinor must be a number/,
    ],
    [
      'a bad currency',
      {
        ...DOC,
        prices: [{ durationDays: 30, amountMinor: 1, currency: 'EURO' }],
      },
      /prices\[0\]\.currency/,
    ],
    [
      'no entitlements',
      { ...DOC, entitlements: null },
      /entitlements required/,
    ],
    [
      'an editor flag that is not a boolean',
      {
        ...DOC,
        entitlements: {
          ...DOC.entitlements,
          editor: { ...EDITOR, bold: 'yes' },
        },
      },
      /editor\.bold must be a boolean/,
    ],
    [
      'limited cities without a count',
      {
        ...DOC,
        entitlements: { ...DOC.entitlements, maxCitiesCount: undefined },
      },
      /maxCitiesCount must be a number/,
    ],
    [
      'upgrade messages not a list',
      { ...DOC, upgradeMessages: 'x' },
      /upgradeMessages must be an array/,
    ],
    [
      'an upgrade message without a feature',
      { ...DOC, upgradeMessages: [{ messageSr: 'x' }] },
      /featureKey required/,
    ],
    [
      'an upgrade message that is not text',
      { ...DOC, upgradeMessages: [{ featureKey: 'f', messageEn: 5 }] },
      /messageEn must be a string/,
    ],
    [
      'an upgrade message over 2000 characters',
      {
        ...DOC,
        upgradeMessages: [{ featureKey: 'f', messageSr: 'x'.repeat(2001) }],
      },
      /exceeds 2000 chars/,
    ],
    [
      'a title over 200 characters',
      { ...DOC, titleSr: 'x'.repeat(201) },
      /titleSr exceeds 200 chars/,
    ],
    [
      'a non-boolean isActive',
      { ...DOC, isActive: 'true' },
      /isActive must be a boolean/,
    ],
    ['a package code outside the four', { ...DOC, code: 'platinum' }, /./],
  ])('refuses %s', (_, doc, message) => {
    expect(() => mapSanityPackageDefinitionDoc(doc)).toThrow(message);
  });
});
