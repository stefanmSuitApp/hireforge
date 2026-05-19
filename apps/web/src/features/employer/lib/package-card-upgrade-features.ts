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

export type PackageCardUpgradeRow = {
  featureKey: PackageCardUpgradeFeatureKey;
  cmsMessageSr: string | null;
  cmsMessageEn: string | null;
};

/**
 * Locked (omitted) package capabilities on the picker; CMS overrides message per feature when present.
 */
export function packageCardUpgradeRowsForPicker(
  item: EmployerPackageCatalogItem,
): PackageCardUpgradeRow[] {
  const cmsByKey = new Map(
    (item.upgradeMessages ?? []).map((row) => [row.featureKey, row]),
  );
  const out: PackageCardUpgradeRow[] = [];
  for (const key of PACKAGE_CARD_UPGRADE_FEATURE_KEYS) {
    if (entitlementIncludesPackageCardFeature(item.entitlements, key)) {
      continue;
    }
    const cms = cmsByKey.get(key);
    out.push({
      featureKey: key,
      cmsMessageSr: cms?.messageSr?.trim() ? cms.messageSr.trim() : null,
      cmsMessageEn: cms?.messageEn?.trim() ? cms.messageEn.trim() : null,
    });
  }
  return out;
}
