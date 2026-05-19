import { z } from 'zod';

import { currencyCodeSchema } from './companies';
import {
  entitlementsBlobSchema,
  packageCodeSchema,
  type PackageCode,
} from './packages';

/** One row in `package_prices` after CMS normalisation. */
export const cmsPackagePriceRowSchema = z.object({
  durationDays: z.number().int().positive(),
  amountMinor: z.number().int().nonnegative(),
  currency: currencyCodeSchema,
});

export type CmsPackagePriceRow = z.infer<typeof cmsPackagePriceRowSchema>;

/** Per-feature upgrade copy on employer package cards (Step 9.5). */
export const cmsPackageUpgradeMessageRowSchema = z.object({
  featureKey: z.string().min(1).max(64),
  messageSr: z.string().max(2000).optional(),
  messageEn: z.string().max(2000).optional(),
});

export type CmsPackageUpgradeMessageRow = z.infer<
  typeof cmsPackageUpgradeMessageRowSchema
>;

/**
 * Normalised payload for mirroring a `packageDefinition` Sanity document into
 * Postgres (`packages`, `package_prices`, `package_entitlements`).
 */
export const cmsPackageMirrorPayloadSchema = z.object({
  /** Sanity document `_id` stored as `packages.cms_ref`. */
  cmsRef: z.string().min(1),
  code: packageCodeSchema,
  isActive: z.boolean(),
  isEnterprise: z.boolean(),
  displayOrder: z.number().int().nullable().optional(),
  prices: z.array(cmsPackagePriceRowSchema),
  /** Validated blob matching `subscriptions.entitlements_json_snapshot` shape. */
  entitlements: entitlementsBlobSchema,
  /** Localized marketing from CMS; null/omit clears mirror columns. */
  titleSr: z.string().max(200).nullable().optional(),
  titleEn: z.string().max(200).nullable().optional(),
  marketingDescriptionSr: z.string().max(4000).nullable().optional(),
  marketingDescriptionEn: z.string().max(4000).nullable().optional(),
  upgradeMessages: z.array(cmsPackageUpgradeMessageRowSchema).optional(),
});

export type CmsPackageMirrorPayload = z.infer<
  typeof cmsPackageMirrorPayloadSchema
>;

/**
 * Webhook / internal POST body. Sanity HTTP webhooks may send the full
 * document as the JSON body, or `{ document: {...} }`, or only an id.
 */
export const cmsSyncPackageRequestSchema = z.looseObject({
  document: z.record(z.string(), z.unknown()).optional(),
  documentId: z.string().optional(),
});

export type CmsSyncPackageRequest = z.infer<typeof cmsSyncPackageRequestSchema>;

/** Stable codes for GROQ filters and Studio validation. */
export const cmsPackageCodes = [
  'tezga',
  'sljaka',
  'sef',
  'gazda',
] as const satisfies readonly PackageCode[];
