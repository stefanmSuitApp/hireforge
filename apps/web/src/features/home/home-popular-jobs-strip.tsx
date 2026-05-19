import type { PublicJobListItem } from 'contracts';

import { PublicJobTeaserCard } from '@/features/jobs/components/public-job-teaser-card';

export function HomePopularJobsStrip({
  locale,
  items,
  title,
  featuredRibbonLabel,
  isAuthenticated = true,
}: {
  locale: string;
  items: PublicJobListItem[];
  title: string;
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
    </section>
  );
}
