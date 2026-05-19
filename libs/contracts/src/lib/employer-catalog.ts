import { z } from 'zod';

import { currencyCodeSchema } from './companies';
import { entitlementsBlobSchema, packageCodeSchema } from './packages';

/** Single price row exposed to employer checkout (DB mirror). */
export const employerCatalogPriceSchema = z.object({
  durationDays: z.number().int().positive(),
  amountMinor: z.number().int().nonnegative(),
  currency: currencyCodeSchema,
});

export type EmployerCatalogPrice = z.infer<typeof employerCatalogPriceSchema>;

export const employerPackageUpgradeMessageSchema = z.object({
  featureKey: z.string(),
  messageSr: z.string().nullable().optional(),
  messageEn: z.string().nullable().optional(),
});

export const employerPackageCatalogItemSchema = z.object({
  code: packageCodeSchema,
  isEnterprise: z.boolean(),
  prices: z.array(employerCatalogPriceSchema),
  entitlements: entitlementsBlobSchema,
  /** When null, checkout UI falls back to static i18n. */
  titleSr: z.string().nullable().optional(),
  titleEn: z.string().nullable().optional(),
  marketingDescriptionSr: z.string().nullable().optional(),
  marketingDescriptionEn: z.string().nullable().optional(),
  upgradeMessages: z.array(employerPackageUpgradeMessageSchema).optional(),
});

export type EmployerPackageCatalogItem = z.infer<
  typeof employerPackageCatalogItemSchema
>;

export const employerPackageCatalogResponseSchema = z.object({
  items: z.array(employerPackageCatalogItemSchema),
});

export type EmployerPackageCatalogResponse = z.infer<
  typeof employerPackageCatalogResponseSchema
>;

export const employerProformaDetailSchema = z.object({
  id: z.uuid(),
  number: z.string(),
  totalMinor: z.number().int().nonnegative(),
  currency: currencyCodeSchema,
  issuedAt: z.string(),
  paidAt: z.string().nullable(),
  subscriptionId: z.uuid(),
  subscriptionStatus: z.enum([
    'pending_payment',
    'active',
    'expired',
    'cancelled',
  ]),
  /** Present when a PDF was generated and stored. */
  pdfStorageKey: z.string().nullable().optional(),
  /** Localized payment wire instructions (CMS + env fallback). */
  paymentInstructionsHtml: z.string().nullable().optional(),
  /** Short refund excerpt for the HTML page footer. */
  refundPolicyExcerpt: z.string().nullable().optional(),
});

export type EmployerProformaDetail = z.infer<
  typeof employerProformaDetailSchema
>;
