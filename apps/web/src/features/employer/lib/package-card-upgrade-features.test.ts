import type { EmployerPackageCatalogItem } from 'contracts';
import { entitlementsBlobFallbackTezgaBaseline } from 'contracts';
import { describe, expect, it } from 'vitest';

import { packageCardFeatureRows } from './package-card-upgrade-features';

const pkg = (code: string, featured: boolean, cmsFeatured?: string) =>
  ({
    code,
    entitlements: {
      ...entitlementsBlobFallbackTezgaBaseline,
      featured_listing: featured,
    },
    upgradeMessages: cmsFeatured
      ? [
          {
            featureKey: 'featured_listing',
            messageSr: cmsFeatured,
            messageEn: null,
          },
        ]
      : [],
  }) as unknown as EmployerPackageCatalogItem;

describe('packageCardFeatureRows', () => {
  const tezga = pkg('tezga', false);
  const sef = pkg('sef', true);
  const catalogue = [tezga, sef];

  it('lists a missing feature apart, with the packages that include it', () => {
    const rows = packageCardFeatureRows(tezga, catalogue);
    expect(rows.included).not.toContain('featured_listing');
    expect(rows.notIncluded).toContainEqual(
      expect.objectContaining({
        featureKey: 'featured_listing',
        availableIn: ['sef'],
      }),
    );
  });

  it('lists a feature the package has as included', () => {
    const rows = packageCardFeatureRows(sef, catalogue);
    expect(rows.included).toContain('featured_listing');
    expect(rows.notIncluded.map((r) => r.featureKey)).not.toContain(
      'featured_listing',
    );
  });

  it('keeps the CMS upgrade message for a missing feature', () => {
    const rows = packageCardFeatureRows(
      pkg('tezga', false, ' Samo u višim paketima '),
      catalogue,
    );
    expect(
      rows.notIncluded.find((r) => r.featureKey === 'featured_listing'),
    ).toMatchObject({ cmsMessageSr: 'Samo u višim paketima' });
  });
});
