// T5.1 the dense logic in contracts: checkout and promo math, package caps,
// subscription transitions, schemas with refinements. Gated at ≥ 90 % lines
// and branches by vitest.config.mts.
import { describe, expect, it } from 'vitest';
import { parseDocumentNumber } from './billing';
import { cvProfileSchema, sanitizeCvProfileForPersist } from './cv-profile';
import {
  employerJobDraftBodySchema,
  employerJobDescriptionImageUploadResponseSchema,
} from './employer-jobs';
import {
  effectiveMaxActiveJobs,
  entitlementsBlobFallbackTezgaBaseline,
  packageAllowsSlotOverride,
} from './packages';
import {
  discountedMinorFromPromo,
  intersectCategoryAllowLists,
  promoAppliesToPackageCode,
  promoWindowContainsNow,
} from './promo-checkout-math';
import {
  promoCodeCreateBodySchema,
  promoCodePatchBodySchema,
} from './promo-codes';
import { plainDescriptionLength } from './prose-plain';
import { publicJobListQuerySchema } from './public-jobs';
import {
  canTransition,
  subscriptionPurchaseRequestSchema,
} from './subscriptions';

describe('promo checkout math', () => {
  it.each([
    [3700, 'full_free', 0, 0],
    [3700, 'percent', 10, 3330],
    [3700, 'percent', 15, 3145],
    [3333, 'percent', 33, 2233],
    [3700, 'percent', 100, 0],
    [3700, 'percent', 0, 3700],
    [3700, 'fixed', 500, 3200],
    [3700, 'fixed', 9999, 0],
  ] as const)(
    '%i minor units with %s %i → %i (floored, never negative)',
    (base, type, value, out) => {
      expect(discountedMinorFromPromo(base, type, value)).toBe(out);
    },
  );

  it('an unknown discount type leaves the price alone', () => {
    expect(discountedMinorFromPromo(3700, 'bogo' as 'fixed', 5)).toBe(3700);
  });

  it('the validity window includes both ends and treats a missing end as open', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-01-31T23:59:59Z');
    expect(promoWindowContainsNow(from, to, from)).toBe(true);
    expect(promoWindowContainsNow(from, to, to)).toBe(true);
    expect(
      promoWindowContainsNow(from, to, new Date('2025-12-31T23:59:59Z')),
    ).toBe(false);
    expect(
      promoWindowContainsNow(from, to, new Date('2026-02-01T00:00:00Z')),
    ).toBe(false);
    expect(promoWindowContainsNow(null, null, new Date())).toBe(true);
  });

  it('an empty or missing package list means every package', () => {
    expect(promoAppliesToPackageCode(null, 'sef')).toBe(true);
    expect(promoAppliesToPackageCode([], 'sef')).toBe(true);
    expect(promoAppliesToPackageCode(['tezga'], 'sef')).toBe(false);
    expect(promoAppliesToPackageCode(['tezga', 'sef'], 'sef')).toBe(true);
  });

  it('category allow lists intersect', () => {
    expect(intersectCategoryAllowLists([])).toEqual([]);
    expect(intersectCategoryAllowLists([['it', 'marketing']])).toEqual([
      'it',
      'marketing',
    ]);
    expect(
      intersectCategoryAllowLists([
        ['it', 'marketing'],
        ['marketing', 'prodaja'],
        ['marketing'],
      ]),
    ).toEqual(['marketing']);
  });
});

describe('package caps', () => {
  it('only ŠEF and GAZDA take a manual job cap', () => {
    expect(
      ['tezga', 'sljaka', 'sef', 'gazda'].map((c) =>
        packageAllowsSlotOverride(c as 'sef'),
      ),
    ).toEqual([false, false, true, true]);
  });

  it('the effective cap is the override where allowed, else the snapshot', () => {
    const ent = {
      ...entitlementsBlobFallbackTezgaBaseline,
      max_active_jobs: 3,
    };
    expect(effectiveMaxActiveJobs('sef', ent, 10)).toBe(10);
    expect(effectiveMaxActiveJobs('sef', ent, null)).toBe(3);
    expect(effectiveMaxActiveJobs('tezga', ent, 10)).toBe(3);
  });
});

describe('subscriptions', () => {
  it.each([
    ['pending_payment', 'active', true],
    ['pending_payment', 'cancelled', true],
    ['active', 'expired', true],
    ['active', 'cancelled', true],
    ['expired', 'active', false],
    ['cancelled', 'active', false],
    ['pending_payment', 'expired', false],
    ['active', 'pending_payment', false],
  ] as const)('%s → %s allowed: %s', (from, to, ok) => {
    expect(canTransition(from, to)).toBe(ok);
  });

  const purchase = (promoCode: unknown) =>
    subscriptionPurchaseRequestSchema.safeParse({
      companyId: '30ff897a-bd6e-4e98-871a-69baf000ee37',
      packageCode: 'tezga',
      durationDays: 30,
      currency: 'EUR',
      promoCode,
    });

  it('a promo code is trimmed and upper-cased; empty means none', () => {
    expect(purchase('  leto-26 ').data?.promoCode).toBe('LETO-26');
    expect(purchase('').data?.promoCode).toBeUndefined();
    expect(purchase(null).data?.promoCode).toBeUndefined();
    expect(purchase(42).success).toBe(false);
  });
});

describe('promo code admin schemas', () => {
  it('a patch with a percent over 100 is refused', () => {
    expect(
      promoCodePatchBodySchema.safeParse({
        discountType: 'percent',
        value: 101,
      }).success,
    ).toBe(false);
    expect(
      promoCodePatchBodySchema.safeParse({ discountType: 'percent', value: 50 })
        .success,
    ).toBe(true);
    expect(promoCodePatchBodySchema.safeParse({ value: 500 }).success).toBe(
      true,
    );
  });

  it('a patch whose window ends before it starts is refused', () => {
    expect(
      promoCodePatchBodySchema.safeParse({
        validFrom: '2026-02-01T00:00:00Z',
        validTo: '2026-01-01T00:00:00Z',
      }).success,
    ).toBe(false);
    expect(
      promoCodePatchBodySchema.safeParse({
        validFrom: '2026-01-01T00:00:00Z',
        validTo: '2026-02-01T00:00:00Z',
      }).success,
    ).toBe(true);
  });

  it('a percent code needs a value of 0..100, a fixed one a currency', () => {
    expect(
      promoCodeCreateBodySchema.safeParse({
        code: 'PCT-1',
        discountType: 'percent',
        value: -1,
      }).success,
    ).toBe(false);
    expect(
      promoCodeCreateBodySchema.safeParse({
        code: 'FIX-1',
        discountType: 'fixed',
        value: 1,
        currency: 'eur',
      }).data?.currency,
    ).toBe('EUR');
  });
});

describe('job drafts', () => {
  const draft = (extra: Record<string, unknown>) =>
    employerJobDraftBodySchema.safeParse({
      title: 'Kuvar',
      workModel: 'onsite',
      employmentType: 'full_time',
      seniority: 'mid',
      ...extra,
    });

  it('external apply needs a URL', () => {
    expect(draft({ applyMode: 'external' }).success).toBe(false);
    expect(
      draft({
        applyMode: 'external',
        externalApplyUrl: 'https://firma.rs/posao',
      }).success,
    ).toBe(true);
  });

  it('empty slugs and taxonomy become undefined; defaults fill in', () => {
    const parsed = draft({
      citySlug: '',
      categorySlug: '',
      slug: '',
      pngCreativeUrl: '',
    }).data;
    expect(parsed).toMatchObject({
      description: '',
      primaryLanguage: 'sr',
      applyMode: 'internal',
      pngCreativeUrl: null,
    });
    expect(parsed?.citySlug).toBeUndefined();
  });

  it('an image upload answer is a same-origin media path or an http(s) URL', () => {
    const ok = (url: string) =>
      employerJobDescriptionImageUploadResponseSchema.safeParse({ url })
        .success;
    expect(
      ok(
        '/api/public/job-description-media/30ff897a-bd6e-4e98-871a-69baf000ee37',
      ),
    ).toBe(true);
    expect(ok('https://cdn.sljakam.com/x.avif')).toBe(true);
    expect(ok('javascript:alert(1)')).toBe(false);
    expect(ok('/api/public/job-description-media/not-a-uuid')).toBe(false);
  });
});

describe('plain description length', () => {
  const doc = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Zdravo' },
          { type: 'text', text: ' svete' },
          'junk',
        ],
      },
    ],
  };

  it('counts the plain text when there is any (including surrounding spaces)', () => {
    expect(plainDescriptionLength('  abc  ', null)).toBe(7);
  });

  it('otherwise counts the text nodes of the TipTap document', () => {
    expect(plainDescriptionLength('   ', doc as never)).toBe(12);
    expect(plainDescriptionLength('', { type: 'paragraph' } as never)).toBe(0);
    expect(plainDescriptionLength('', null)).toBe(0);
  });
});

describe('CV profile', () => {
  it('drops incomplete rows and trims, clamps and normalises the rest', () => {
    const out = sanitizeCvProfileForPersist({
      experiences: [
        {
          company: ' Firma ',
          title: ' Vozač ',
          startDate: '2020-01-01',
          endDate: 'bad',
          summary: ` ${'s'.repeat(600)} `,
        },
        { company: '', title: 'x', startDate: '2020-01-01' },
        { company: 'Bez datuma', title: 'x', startDate: 'jan 2020' },
        {
          company: 'B',
          title: 'T',
          startDate: '2021-02-02',
          endDate: '2022-03-03',
          summary: '  ',
        },
      ],
      education: [
        {
          institution: ' Fakultet ',
          degree: ' ',
          field: ` ${'f'.repeat(200)}`,
          startDate: '2010-09-01',
          endDate: '',
        },
        { institution: '', startDate: '2010-09-01' },
      ],
      skills: [{ name: ' Excel ' }, { name: '  ' }, { name: 'x'.repeat(100) }],
    });
    expect(out.experiences).toEqual([
      {
        company: 'Firma',
        title: 'Vozač',
        startDate: '2020-01-01',
        endDate: null,
        summary: 's'.repeat(500),
      },
      {
        company: 'B',
        title: 'T',
        startDate: '2021-02-02',
        endDate: '2022-03-03',
        summary: undefined,
      },
    ]);
    expect(out.education).toEqual([
      {
        institution: 'Fakultet',
        degree: undefined,
        field: 'f'.repeat(120),
        startDate: '2010-09-01',
        endDate: null,
      },
    ]);
    expect(out.skills).toEqual([{ name: 'Excel' }, { name: 'x'.repeat(80) }]);
    expect(cvProfileSchema.safeParse(out).success).toBe(true);
  });

  it('keeps a degree, and treats a missing summary, field or end date as absent', () => {
    const out = sanitizeCvProfileForPersist({
      experiences: [{ company: 'A', title: 'B', startDate: '2020-01-01' }],
      education: [
        { institution: 'ETF', degree: ' Dipl. inž. ', startDate: '2010-09-01' },
      ],
      skills: [],
    });
    expect(out.experiences[0]).toEqual({
      company: 'A',
      title: 'B',
      startDate: '2020-01-01',
      endDate: null,
      summary: undefined,
    });
    expect(out.education[0]).toEqual({
      institution: 'ETF',
      degree: 'Dipl. inž.',
      field: undefined,
      startDate: '2010-09-01',
      endDate: null,
    });
  });
});

describe('public job list query', () => {
  it('fills defaults and turns empty strings into "no filter"', () => {
    expect(
      publicJobListQuerySchema.parse({
        q: '',
        city: '',
        workModel: '',
        easyApply: '',
      }),
    ).toEqual({
      page: 1,
      pageSize: 20,
      sort: 'newest',
    });
  });

  it('reads easyApply from "1", "true" or true', () => {
    for (const v of ['1', 'true', true])
      expect(publicJobListQuerySchema.parse({ easyApply: v }).easyApply).toBe(
        true,
      );
    expect(publicJobListQuerySchema.parse({ easyApply: '0' }).easyApply).toBe(
      false,
    );
  });

  it('refuses a page size over 50 and a slug with spaces', () => {
    expect(publicJobListQuerySchema.safeParse({ pageSize: '51' }).success).toBe(
      false,
    );
    expect(
      publicJobListQuerySchema.safeParse({ city: 'novi sad' }).success,
    ).toBe(false);
  });
});

describe('billing document numbers', () => {
  it('parse PR / RA / CN numbers and refuse anything else', () => {
    expect(parseDocumentNumber('RA-2026/000042')).toMatchObject({
      kind: 'invoice',
      year: 2026,
    });
    expect(parseDocumentNumber('XX-2026/000042')).toBeNull();
    expect(parseDocumentNumber('RA-2026/42')).toBeNull();
  });
});
