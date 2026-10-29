import type { EmployerPackageCatalogItem, EntitlementsBlob } from 'contracts';

/**
 * Must stay aligned with Sanity `packageDefinition.upgradeMessages.featureKey` options.
 * @see apps/cms/schemaTypes/documents/packageDefinition.ts
 */
export const PACKAGE_CARD_UPGRADE_FEATURE_KEYS = [
  'featured_listing',
  'png_creative',
  'crossborder_visible',
  'social_publish',
  'paid_social_ads',
  'editor_rich',
  'image_upload',
  'hyperlinks',
] as const;

export type PackageCardUpgradeFeatureKey =
  (typeof PACKAGE_CARD_UPGRADE_FEATURE_KEYS)[number];

export function entitlementIncludesPackageCardFeature(
  e: EntitlementsBlob,
  key: PackageCardUpgradeFeatureKey,
): boolean {
  switch (key) {
    case 'featured_listing':
      return e.featured_listing;
    case 'png_creative':
      return e.png_creative;
    case 'crossborder_visible':
      return e.crossborder_visible;
    case 'social_publish':
      return e.social_publish;
    case 'paid_social_ads':
      return e.paid_social_ads;
    case 'editor_rich':
      return e.editor.headings && e.editor.lists;
    case 'image_upload':
      return e.editor.image_upload;
    case 'hyperlinks':
      return e.editor.hyperlinks && e.hyperlinks_max_count > 0;
    default:
      return false;
  }
}

export type PackageCardNotIncludedRow = {
  featureKey: PackageCardUpgradeFeatureKey;
  /** Codes of the other packages in the catalogue that include it. */
  availableIn: EmployerPackageCatalogItem['code'][];
  cmsMessageSr: string | null;
  cmsMessageEn: string | null;
};

export type PackageCardFeatureRows = {
  included: PackageCardUpgradeFeatureKey[];
  notIncluded: PackageCardNotIncludedRow[];
};

/**
 * What a package card lists: the features it has, and the ones it doesn't with
 * the packages that do (or the CMS upgrade message for that feature). Keeping
 * them apart stops a missing feature reading like an included one.
 */
export function packageCardFeatureRows(
  item: EmployerPackageCatalogItem,
  catalogue: readonly EmployerPackageCatalogItem[],
): PackageCardFeatureRows {
  const cmsByKey = new Map(
    (item.upgradeMessages ?? []).map((row) => [row.featureKey, row]),
  );
  const included: PackageCardUpgradeFeatureKey[] = [];
  const notIncluded: PackageCardNotIncludedRow[] = [];
  for (const key of PACKAGE_CARD_UPGRADE_FEATURE_KEYS) {
    if (entitlementIncludesPackageCardFeature(item.entitlements, key)) {
      included.push(key);
      continue;
    }
    const cms = cmsByKey.get(key);
    notIncluded.push({
      featureKey: key,
      availableIn: catalogue
        .filter(
          (other) =>
            other.code !== item.code &&
            entitlementIncludesPackageCardFeature(other.entitlements, key),
        )
        .map((other) => other.code),
      cmsMessageSr: cms?.messageSr?.trim() ? cms.messageSr.trim() : null,
      cmsMessageEn: cms?.messageEn?.trim() ? cms.messageEn.trim() : null,
    });
  }
  return { included, notIncluded };
}
