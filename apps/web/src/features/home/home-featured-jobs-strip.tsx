import type { PublicJobListItem } from 'contracts';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

import { PublicJobTeaserCard } from '@/features/jobs/components/public-job-teaser-card';

type Props = {
  locale: string;
  items: PublicJobListItem[];
  title: string;
  subtitle: string;
  viewAllLabel: string;
  featuredRibbonLabel: string;
  isAuthenticated?: boolean;
};

export function HomeFeaturedJobsStrip({
  locale,
  items,
  title,
  subtitle,
  viewAllLabel,
  featuredRibbonLabel,
  isAuthenticated = true,
}: Props) {
  if (items.length === 0) return null;

  const viewAllHref = isAuthenticated
    ? '/jobs'
    : `/sign-in?returnTo=${encodeURIComponent(`/${locale}/jobs`)}`;

  return (
    <section>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="m-0 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {title}
          </h2>
          <p className="m-0 mt-2 max-w-xl text-base text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <Button
          variant="outline"
          className="shrink-0 rounded-full"
          size="sm"
          asChild
        >
          <Link href={viewAllHref} locale={locale}>
            {viewAllLabel}
          </Link>
        </Button>
      </div>
      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((job) => (
          <li key={job.id}>
            <PublicJobTeaserCard
              job={job}
              locale={locale}
              spotlight
              featuredRibbonLabel={featuredRibbonLabel}
              isAuthenticated={isAuthenticated}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
