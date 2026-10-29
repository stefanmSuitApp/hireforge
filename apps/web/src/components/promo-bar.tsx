import { Gift } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import type { PromoBanner } from '@/lib/promo-banner';

/** Site-wide strip above the header while a campaign or announcement runs. */
export async function PromoBar({
  banner,
  locale,
}: {
  banner: PromoBanner;
  locale: string;
}) {
  const t = await getTranslations('Nav');
  return (
    <div
      role="region"
      aria-label={t('promoRegion')}
      className="hf-slide-down bg-featured text-featured-foreground"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center text-sm font-semibold">
        <Gift className="size-4 shrink-0" aria-hidden />
        <Link
          href={banner.href}
          locale={locale}
          className="underline-offset-4 hover:underline"
        >
          {banner.text}
        </Link>
      </div>
    </div>
  );
}
