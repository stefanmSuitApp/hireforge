import { z } from 'zod';

import { currencyCodeSchema } from './companies';

// --- Stable codes ----------------------------------------------------------

/**
 * Stable package codes (see SSOT §6.1 + DB CHECK on `packages.code`).
 *
 * These do NOT change once shipped. Public display names live in CMS and may
 * differ per locale; only the code is the runtime handle.
 */
export const packageCodes = ['tezga', 'sljaka', 'sef', 'gazda'] as const;

export type PackageCode = (typeof packageCodes)[number];

export const packageCodeSchema = z.enum(packageCodes);

// --- Entitlement keys ------------------------------------------------------

/**
 * Conventional entitlement keys mirrored from CMS (see SSOT §6.3).
 *
 * Adding a new key requires:
 *   1) extend this tuple,
 *   2) extend `entitlementsBlobShape` below with the matching value schema,
 *   3) add a row to `package_entitlements` in the seed / via CMS sync.
 */
export const entitlementKeys = [
  'max_active_jobs',
  'max_cities',
  'max_characters',
  'featured_listing',
  'png_creative',
  'social_publish',
  'paid_social_ads',
  'crossborder_visible',
  'editor',
  'hyperlinks_max_count',
] as const;

export type EntitlementKey = (typeof entitlementKeys)[number];

export const entitlementKeySchema = z.enum(entitlementKeys);

// --- Editor capabilities ---------------------------------------------------

/**
 * `editor` entitlement value — TipTap capability flags per SSOT §6.3.
 *
 * `custom_html` is permanently disabled (anti-XSS); the schema pins it to
 * `false` so a CMS error or rogue sync can never escalate it.
 */
export const editorCapabilitySchema = z
  .object({
    bold: z.boolean(),
    italic: z.boolean(),
    underline: z.boolean(),
    headings: z.boolean(),
    lists: z.boolean(),
    blockquote: z.boolean(),
    inline_code: z.boolean(),
    code_block: z.boolean(),
    text_align: z.boolean(),
    image_upload: z.boolean(),
    embed: z.boolean(),
    hyperlinks: z.boolean(),
    custom_html: z.literal(false),
  })
  .strict();

export type EditorCapability = z.infer<typeof editorCapabilitySchema>;

// --- Entitlements blob ------------------------------------------------------

const positiveInt = z.number().int().positive();
const nonNegInt = z.number().int().min(0);
/** "unlimited" sentinel value for `max_cities`. */
const unlimitedOrInt = z.union([z.literal('unlimited'), nonNegInt]);

/**
 * Per-key value schemas for `entitlements_json_snapshot` (subscriptions) and
 * `package_entitlements.value` (mirror).
 *
 * Indexed by `EntitlementKey`; consumers should read via the helpers below.
 */
export const entitlementValueByKey = {
  max_active_jobs: positiveInt,
  max_cities: unlimitedOrInt,
  max_characters: positiveInt,
  featured_listing: z.boolean(),
  png_creative: z.boolean(),
  social_publish: z.boolean(),
  paid_social_ads: z.boolean(),
  crossborder_visible: z.boolean(),
  editor: editorCapabilitySchema,
  hyperlinks_max_count: nonNegInt,
} as const satisfies Record<EntitlementKey, z.ZodType>;

/**
 * Full snapshot blob: every entitlement key required, each validated by its
 * per-key schema. Unknown keys rejected via `.strict()`.
 */
export const entitlementsBlobSchema = z
  .object({
    max_active_jobs: entitlementValueByKey.max_active_jobs,
    max_cities: entitlementValueByKey.max_cities,
    max_characters: entitlementValueByKey.max_characters,
    featured_listing: entitlementValueByKey.featured_listing,
    png_creative: entitlementValueByKey.png_creative,
    social_publish: entitlementValueByKey.social_publish,
    paid_social_ads: entitlementValueByKey.paid_social_ads,
    crossborder_visible: entitlementValueByKey.crossborder_visible,
    editor: entitlementValueByKey.editor,
    hyperlinks_max_count: entitlementValueByKey.hyperlinks_max_count,
  })
  .strict();

export type EntitlementsBlob = z.infer<typeof entitlementsBlobSchema>;

/**
 * Conservative default when a legacy job has no subscription row (composer + API
 * should still behave predictably).
 */
export const entitlementsBlobFallbackTezgaBaseline: EntitlementsBlob = {
  max_active_jobs: 1,
  max_cities: 1,
  max_characters: 400,
  featured_listing: false,
  png_creative: false,
  social_publish: false,
  paid_social_ads: false,
  crossborder_visible: false,
  hyperlinks_max_count: 1,
  editor: {
    bold: false,
    italic: false,
    underline: false,
    headings: false,
    lists: false,
    blockquote: false,
    inline_code: false,
    code_block: false,
    text_align: false,
    image_upload: false,
    embed: false,
    hyperlinks: true,
    custom_html: false,
  },
};

// --- Pricing ---------------------------------------------------------------

/** Single price row mirrored from `package_prices`. */
export const packagePriceSchema = z.object({
  packageCode: packageCodeSchema,
  durationDays: z.number().int().positive(),
  amountMinor: z.number().int().nonnegative(),
  currency: currencyCodeSchema,
});

export type PackagePrice = z.infer<typeof packagePriceSchema>;

// --- Package definition ----------------------------------------------------

/**
 * Mirror shape returned by `/packages` API. Aggregates `packages` row plus its
 * prices and entitlements.
 */
export const packageDefinitionSchema = z.object({
  code: packageCodeSchema,
  isActive: z.boolean(),
  isEnterprise: z.boolean(),
  displayOrder: z.number().int().nullable().optional(),
  /**
   * Public-facing names per locale (sourced from CMS in Step 6). For seed /
   * runtime defaults the API may omit non-Serbian locales until CMS supplies them.
   */
  nameSr: z.string().min(1).max(120),
  nameEn: z.string().min(1).max(120).optional(),
  prices: z.array(packagePriceSchema),
  entitlements: entitlementsBlobSchema,
});

export type PackageDefinition = z.infer<typeof packageDefinitionSchema>;

/** Packages where ops may set `subscriptions.max_active_jobs_override`. */
export function packageAllowsSlotOverride(code: PackageCode): boolean {
  return code === 'sef' || code === 'gazda';
}

/**
 * Effective concurrent listing cap: manual override (SEF/GAZDA) or snapshot default.
 */
export function effectiveMaxActiveJobs(
  packageCode: PackageCode,
  entitlements: EntitlementsBlob,
  override: number | null,
): number {
  if (override != null && packageAllowsSlotOverride(packageCode)) {
    return override;
  }
  return entitlements.max_active_jobs;
}
