import { getTranslations } from 'next-intl/server';

import { campaignEndDate, fetchPublicCampaign } from '@/lib/public-campaign';
import type { AuthRole } from '@/lib/unified-auth';

export type PromoBanner = { text: string; href: string };

/**
 * The site-wide promo bar. Only a campaign an admin started (admin →
 * campaigns, with its own start and end) shows it (Stefan, 2026-10-29);
 * nothing else does. Candidates don't see it (it advertises posting jobs).
 */
export async function resolvePromoBanner(
  locale: string,
  role: AuthRole | null,
): Promise<PromoBanner | null> {
  if (role === 'candidate') return null;
  const campaign = await fetchPublicCampaign();
  if (!campaign) return null;
  const tCampaign = await getTranslations('Campaign');
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
