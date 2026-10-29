import { beforeEach, describe, expect, it, vi } from 'vitest';

const campaign = vi.fn();
const cmsBanner = vi.fn();

vi.mock('@/lib/public-campaign', () => ({
  fetchPublicCampaign: () => campaign(),
  campaignEndDate: () => '7. 11. 2026.',
}));
vi.mock('@/lib/cms-content', () => ({
  fetchCmsHomePromoBanner: () => cmsBanner(),
}));
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));

import { resolvePromoBanner } from './promo-banner';

const running = {
  discountType: 'full_free',
  value: 0,
  bannerSr: null,
  bannerEn: null,
};

describe('resolvePromoBanner', () => {
  beforeEach(() => {
    campaign.mockReset();
    cmsBanner.mockReset();
    cmsBanner.mockResolvedValue({ text: 'CMS najava', href: '/x' });
  });

  // Stefan, 2026-10-29: only a campaign an admin started (with its own
  // start and end) shows the bar; a CMS calendar announcement does not.
  it('shows nothing without a running campaign, even with a CMS announcement', async () => {
    campaign.mockResolvedValue(null);
    expect(await resolvePromoBanner('sr', null)).toBeNull();
  });

  it('shows the running campaign to guests and employers, not candidates', async () => {
    campaign.mockResolvedValue(running);
    expect(await resolvePromoBanner('sr', null)).toEqual({
      text: 'bannerFree',
      href: '/employer/register',
    });
    expect((await resolvePromoBanner('sr', 'employer'))?.href).toBe(
      '/employer/packages',
    );
    expect(await resolvePromoBanner('sr', 'candidate')).toBeNull();
  });
});
