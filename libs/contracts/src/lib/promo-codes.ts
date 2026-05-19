import { z } from 'zod';

import { packageCodeSchema } from './packages';

// --- Discount type ---------------------------------------------------------

/** Promo discount kinds; matches `promo_codes.discount_type` CHECK. */
export const promoDiscountTypes = ['percent', 'fixed', 'full_free'] as const;

export type PromoDiscountType = (typeof promoDiscountTypes)[number];

export const promoDiscountTypeSchema = z.enum(promoDiscountTypes);

// --- Code shape ------------------------------------------------------------

/** Marketing code: uppercase ASCII alphanum + dashes, 4–32 chars. */
export const promoCodeStringSchema = z
  .string()
  .trim()
  .min(4)
  .max(32)
  .regex(/^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$/, {
    message: 'Promo code must be uppercase ASCII alphanum with optional dashes',
  });

// --- Promo code body --------------------------------------------------------

const taxonomySlug = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const positiveIntOrNull = z
  .union([z.number().int().positive(), z.null()])
  .optional();

/**
 * Body for `POST /api/admin/promo-codes` (Step 14).
 *
 * `value` semantics depend on `discountType`:
 *   * `percent`   — integer 0..100
 *   * `fixed`     — integer minor units (matches package_prices)
 *   * `full_free` — value ignored; service may persist 0
 */
export const promoCodeCreateBodySchema = z
  .object({
    code: promoCodeStringSchema,
    discountType: promoDiscountTypeSchema,
    value: z.number().int().min(0).default(0),
    validFrom: z.iso.datetime({ offset: true }).optional().nullable(),
    validTo: z.iso.datetime({ offset: true }).optional().nullable(),
    /** When provided, only listed package codes are eligible. */
    applicablePackages: z.array(packageCodeSchema).optional().nullable(),
    /** When provided, only listed category slugs are eligible. */
    applicableCategories: z.array(taxonomySlug).optional().nullable(),
    maxRedemptions: positiveIntOrNull,
    maxPerCompany: positiveIntOrNull,
  })
  .superRefine((val, ctx) => {
    if (val.discountType === 'percent' && (val.value < 0 || val.value > 100)) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'For discountType "percent", value must be an integer 0..100',
      });
    }
    if (val.validFrom && val.validTo && val.validFrom > val.validTo) {
      ctx.addIssue({
        code: 'custom',
        path: ['validTo'],
        message: 'validTo must be on or after validFrom',
      });
    }
  });

export type PromoCodeCreateBody = z.infer<typeof promoCodeCreateBodySchema>;

/** Body for `PATCH /admin/promo-codes/:id` — `code` is immutable after create. */
export const promoCodePatchBodySchema = z
  .object({
    discountType: promoDiscountTypeSchema.optional(),
    value: z.number().int().min(0).optional(),
    validFrom: z.iso.datetime({ offset: true }).optional().nullable(),
    validTo: z.iso.datetime({ offset: true }).optional().nullable(),
    applicablePackages: z.array(packageCodeSchema).optional().nullable(),
    applicableCategories: z.array(taxonomySlug).optional().nullable(),
    maxRedemptions: positiveIntOrNull,
    maxPerCompany: positiveIntOrNull,
  })
  .superRefine((val, ctx) => {
    if (
      val.discountType === 'percent' &&
      val.value !== undefined &&
      (val.value < 0 || val.value > 100)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'For discountType "percent", value must be an integer 0..100',
      });
    }
    if (val.validFrom && val.validTo && val.validFrom > val.validTo) {
      ctx.addIssue({
        code: 'custom',
        path: ['validTo'],
        message: 'validTo must be on or after validFrom',
      });
    }
  });

export type PromoCodePatchBody = z.infer<typeof promoCodePatchBodySchema>;

export const adminPromoCodesListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type AdminPromoCodesListQuery = z.infer<
  typeof adminPromoCodesListQuerySchema
>;

// --- Response shape --------------------------------------------------------

export const promoCodeResponseSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  discountType: promoDiscountTypeSchema,
  value: z.number().int().nonnegative(),
  validFrom: z.string().nullable(),
  validTo: z.string().nullable(),
  applicablePackages: z.array(packageCodeSchema).nullable(),
  applicableCategories: z.array(z.string()).nullable(),
  maxRedemptions: z.number().int().positive().nullable(),
  maxPerCompany: z.number().int().positive().nullable(),
  redemptionsCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PromoCodeResponse = z.infer<typeof promoCodeResponseSchema>;

export const adminPromoCodesListResponseSchema = z.object({
  items: z.array(promoCodeResponseSchema),
  total: z.number().int().nonnegative(),
});

export type AdminPromoCodesListResponse = z.infer<
  typeof adminPromoCodesListResponseSchema
>;

// --- Redemption shape ------------------------------------------------------

export const promoRedemptionSchema = z.object({
  id: z.uuid(),
  promoCodeId: z.uuid(),
  code: z.string(),
  companyId: z.uuid(),
  subscriptionId: z.uuid().nullable(),
  redeemedAt: z.string(),
});

export type PromoRedemption = z.infer<typeof promoRedemptionSchema>;
