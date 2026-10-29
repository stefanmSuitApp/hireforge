import { z } from 'zod';

import { packageCodeSchema } from './packages';

/**
 * Public campaigns (docs/plans/EMPTY_SITE_AND_CAMPAIGNS.md, P): applied at
 * checkout without a code and advertised in the home banner. Private promo
 * codes are a different kind and never appear on the site.
 */
export const campaignDiscountTypes = ['full_free', 'percent'] as const;
export const campaignDiscountTypeSchema = z.enum(campaignDiscountTypes);
export type CampaignDiscountType = (typeof campaignDiscountTypes)[number];

const bannerText = z.string().trim().min(1).max(200).optional().nullable();

export const campaignCreateBodySchema = z
  .object({
    discountType: campaignDiscountTypeSchema,
    /** Percent off (1..100); ignored for `full_free`. */
    value: z.number().int().min(0).max(100).default(0),
    validFrom: z.iso.datetime({ offset: true }),
    validTo: z.iso.datetime({ offset: true }),
    /** Null or empty: every self-service package. */
    applicablePackages: z.array(packageCodeSchema).optional().nullable(),
    /** Total uses across all companies; null = unlimited. */
    maxRedemptions: z.number().int().positive().optional().nullable(),
    bannerSr: bannerText,
    bannerEn: bannerText,
  })
  .superRefine((val, ctx) => {
    if (val.discountType === 'percent' && val.value < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'A percent campaign needs a value of 1..100',
      });
    }
    if (val.validFrom >= val.validTo) {
      ctx.addIssue({
        code: 'custom',
        path: ['validTo'],
        message: 'validTo must be after validFrom',
      });
    }
  });

export type CampaignCreateBody = z.infer<typeof campaignCreateBodySchema>;

export const campaignPatchBodySchema = z.object({
  isActive: z.boolean().optional(),
  validTo: z.iso.datetime({ offset: true }).optional(),
  bannerSr: bannerText,
  bannerEn: bannerText,
  maxRedemptions: z.number().int().positive().optional().nullable(),
});

export type CampaignPatchBody = z.infer<typeof campaignPatchBodySchema>;

export const campaignResponseSchema = z.object({
  id: z.uuid(),
  discountType: campaignDiscountTypeSchema,
  value: z.number().int().nonnegative(),
  validFrom: z.string(),
  validTo: z.string(),
  applicablePackages: z.array(packageCodeSchema).nullable(),
  maxRedemptions: z.number().int().positive().nullable(),
  redemptionsCount: z.number().int().nonnegative(),
  isActive: z.boolean(),
  bannerSr: z.string().nullable(),
  bannerEn: z.string().nullable(),
  createdAt: z.string(),
});

export type CampaignResponse = z.infer<typeof campaignResponseSchema>;

export const adminCampaignsListResponseSchema = z.object({
  items: z.array(campaignResponseSchema),
});

export type AdminCampaignsListResponse = z.infer<
  typeof adminCampaignsListResponseSchema
>;

/** `GET /api/public/campaign`: what visitors may know. Never a code. */
export const publicCampaignSchema = z.object({
  discountType: campaignDiscountTypeSchema,
  value: z.number().int().nonnegative(),
  validTo: z.string(),
  applicablePackages: z.array(packageCodeSchema).nullable(),
  bannerSr: z.string().nullable(),
  bannerEn: z.string().nullable(),
});

export type PublicCampaign = z.infer<typeof publicCampaignSchema>;

export const publicCampaignResponseSchema = z.object({
  campaign: publicCampaignSchema.nullable(),
});

export type PublicCampaignResponse = z.infer<
  typeof publicCampaignResponseSchema
>;

// --- Campaign length in Belgrade time ---------------------------------------

const BELGRADE = 'Europe/Belgrade';

/** Belgrade's UTC offset in minutes at `instant` (60 in winter, 120 in summer). */
function belgradeOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BELGRADE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant);
  const n = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    n('year'),
    n('month') - 1,
    n('day'),
    n('hour'),
    n('minute'),
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/** The UTC instant of 00:00 Belgrade time on `date` (`YYYY-MM-DD`). */
export function belgradeMidnight(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - belgradeOffsetMinutes(new Date(guess)) * 60_000;
  // Re-check at the result: the offset can differ across a DST change.
  return new Date(guess - belgradeOffsetMinutes(new Date(first)) * 60_000);
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export type CampaignLength =
  | { kind: 'weekend' }
  | { kind: 'days'; days: number };

/**
 * Campaign window from a start day, in Belgrade time.
 * - `weekend`: the Friday on or after `startDate`, 00:00, to Sunday 23:59:59.
 * - `days`: `startDate` 00:00 for `days` whole days (7 = a week).
 */
export function campaignWindow(
  startDate: string,
  length: CampaignLength,
): { validFrom: string; validTo: string } {
  let first = startDate;
  let days = length.kind === 'weekend' ? 3 : length.days;
  if (length.kind === 'weekend') {
    const weekday = new Date(`${startDate}T12:00:00Z`).getUTCDay();
    first = addDays(startDate, (5 - weekday + 7) % 7);
    days = 3;
  }
  const from = belgradeMidnight(first);
  const to = new Date(belgradeMidnight(addDays(first, days)).getTime() - 1000);
  return { validFrom: from.toISOString(), validTo: to.toISOString() };
}
