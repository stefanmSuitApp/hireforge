import { publicCampaignResponseSchema, type PublicCampaign } from 'contracts';

import { nestApiUrl, resolveNestPublicOrigin } from './nest-api-url';

/**
 * The running public campaign (never a private promo code), or null. Cached
 * for a minute, so a paused or ended campaign leaves the site within ~60 s.
 */
export async function fetchPublicCampaign(): Promise<PublicCampaign | null> {
  const url = nestApiUrl(resolveNestPublicOrigin() ?? '', 'public/campaign');
  if (!url) return null;
  try {
    const res = await fetch(url, {
      next: { revalidate: 60, tags: ['public:campaign'] },
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const parsed = publicCampaignResponseSchema.safeParse(await res.json());
    return parsed.success ? parsed.data.campaign : null;
  } catch {
    return null;
  }
}

/** "8. novembar" / "8 November", the last day in Belgrade time. */
export function campaignEndDate(campaign: PublicCampaign, locale: string) {
  return new Intl.DateTimeFormat(locale === 'sr' ? 'sr-Latn-RS' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Belgrade',
  }).format(new Date(campaign.validTo));
}
