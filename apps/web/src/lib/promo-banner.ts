import { getTranslations } from 'next-intl/server';

import { fetchCmsHomePromoBanner } from '@/lib/cms-content';
import { campaignEndDate, fetchPublicCampaign } from '@/lib/public-campaign';
import type { AuthRole } from '@/lib/unified-auth';

export type PromoBanner = { text: string; href: string };

/**
 * The site-wide promo bar: a running campaign, else the CMS calendar's
 * announcement. Candidates don't see it (it advertises posting jobs).
 */
export async function resolvePromoBanner(
  locale: string,
  role: AuthRole | null,
): Promise<PromoBanner | null> {
  if (role === 'candidate') return null;
  const [campaign, cmsBanner, tCampaign] = await Promise.all([
    fetchPublicCampaign(),
    fetchCmsHomePromoBanner(locale),
    getTranslations('Campaign'),
  ]);
  if (!campaign) return cmsBanner;
  return {
    text:
      (locale === 'en' ? campaign.bannerEn : campaign.bannerSr) ??
      tCampaign(
        campaign.discountType === 'full_free' ? 'bannerFree' : 'bannerPercent',
        { percent: campaign.value, date: campaignEndDate(campaign, locale) },
      ),
    href: role === 'employer' ? '/employer/packages' : '/employer/register',
  };
}
