import type { PublicJobListItem } from 'contracts';

import { ArrowRight } from 'lucide-react';

import { PublicJobTeaserCard } from '@/features/jobs/components/public-job-teaser-card';
import { Link } from '@/i18n/navigation';

export function HomePopularJobsStrip({
  locale,
  items,
  title,
  viewAllLabel,
  featuredRibbonLabel,
  isAuthenticated = true,
}: {
  locale: string;
  items: PublicJobListItem[];
  title: string;
  /** The way into the full list (the featured strip may be absent). */
  viewAllLabel: string;
  featuredRibbonLabel?: string;
  isAuthenticated?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="m-0 mb-8 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {title}
      </h2>
      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((job) => (
          <li key={job.id}>
            <PublicJobTeaserCard
              job={job}
              locale={locale}
              spotlight={Boolean(job.featured)}
              featuredRibbonLabel={featuredRibbonLabel}
              isAuthenticated={isAuthenticated}
            />
          </li>
        ))}
      </ul>
      <Link
        href="/jobs"
        locale={locale}
        className="mt-6 inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline"
      >
        {viewAllLabel}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}
