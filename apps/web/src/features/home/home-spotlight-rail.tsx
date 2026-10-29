'use client';

import { ArrowRight } from 'lucide-react';
import { useLocale } from 'next-intl';
import * as React from 'react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import type { HomeJobsSpotlightTile as BaseTile } from '@/lib/home-jobs-discovery';

/** `exploreLabel`: the whole declined button text from Sanity ("Istraži Suboticu"). */
type HomeJobsSpotlightTile = BaseTile & { exploreLabel?: string | null };

type Props = {
  title: string;
  titleAccent?: string;
  subtitle: string;
  tiles: HomeJobsSpotlightTile[];
  /** Categories: a grid of photo tiles; cities: the photo accordion. */
  variant?: 'accordion' | 'grid';
  initialOpenIndex?: number;
  className?: string;
  /** Button label prefix, e.g. "Explore" → "Explore IT" */
  exploreLabelPrefix?: string;
  isAuthenticated?: boolean;
};

/** The tile's CMS photo, else its initial on the placeholder colour. */
function TileImage({
  tile,
  className,
}: {
  tile: HomeJobsSpotlightTile;
  className?: string;
}) {
  return tile.imageUrl ? (
    <img
      src={tile.imageUrl}
      alt=""
      className={cn('h-full w-full object-cover', className)}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-placeholder',
        className,
      )}
    >
      <span className="select-none text-5xl font-extrabold text-placeholder-foreground/60">
        {tile.label.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export function HomeSpotlightRail({
  title,
  titleAccent,
  subtitle,
  tiles,
  variant = 'accordion',
  initialOpenIndex = 0,
  className,
  exploreLabelPrefix,
  isAuthenticated = true,
}: Props) {
  const headingId = React.useId();
  const locale = useLocale();
  const [activeIdx, setActiveIdx] = React.useState(initialOpenIndex);

  React.useEffect(() => {
    if (tiles.length === 0) {
      setActiveIdx(0);
      return;
    }
    setActiveIdx(Math.max(0, Math.min(initialOpenIndex, tiles.length - 1)));
  }, [initialOpenIndex, tiles.length]);

  if (tiles.length === 0) return null;

  function tileHref(jobsHref: string): string {
    return isAuthenticated
      ? jobsHref
      : `/sign-in?returnTo=${encodeURIComponent(`/${locale}${jobsHref}`)}`;
  }
  const exploreLabel = (label: string) =>
    exploreLabelPrefix ? `${exploreLabelPrefix} ${label}` : label;

  return (
    <section className={className} aria-labelledby={headingId}>
      <div className="mb-8">
        <h2
          id={headingId}
          className="m-0 text-3xl font-extrabold tracking-tight text-foreground md:text-[2.125rem]"
        >
          {titleAccent ? (
            <>
              {title.replace(titleAccent, '')}{' '}
              <span className="text-primary">{titleAccent}</span>
            </>
          ) : (
            title
          )}
        </h2>
        <p className="m-0 mt-2 max-w-xl text-base leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>

      {variant === 'grid' ? (
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map((tile, idx) => (
            <li key={`${tile.slug}-${idx}`} className="hf-reveal">
              <Link
                href={tileHref(tile.jobsHref)}
                locale={locale}
                className="hf-lift group block overflow-hidden rounded-[22px] border border-border bg-card no-underline"
              >
                <div className="h-28 overflow-hidden">
                  <TileImage
                    tile={tile}
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  <span className="text-[0.9375rem] font-bold text-foreground">
                    {tile.label}
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-3 md:h-[440px] md:flex-row">
          {tiles.map((tile, idx) => {
            const isOpen = idx === activeIdx;
            return (
              <div
                key={`${tile.slug}-${idx}`}
                className={cn(
                  'group relative overflow-hidden rounded-3xl transition-[flex-grow,height] duration-500 ease-[var(--ease-soft)]',
                  isOpen
                    ? 'h-72 md:h-auto md:flex-[4_1_0%]'
                    : 'h-16 md:h-auto md:min-w-0 md:flex-[1_1_0%]',
                )}
              >
                <TileImage
                  tile={tile}
                  className={cn(
                    'transition-transform duration-700 ease-[var(--ease-soft)]',
                    !isOpen && 'group-hover:scale-110',
                  )}
                />
                {isOpen ? (
                  // Mounted on open; fades in once the card has widened, on
                  // one line so nothing re-wraps while it grows.
                  <div
                    key={`open-${idx}`}
                    className="hf-appear absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 overflow-hidden whitespace-nowrap rounded-2xl border border-border bg-card px-5 py-4"
                  >
                    <span className="truncate text-2xl font-extrabold tracking-tight text-foreground">
                      {tile.label}
                    </span>
                    <Link
                      href={tileHref(tile.jobsHref)}
                      locale={locale}
                      className="hf-press inline-flex min-h-11 shrink-0 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground no-underline"
                    >
                      {tile.exploreLabel ?? exploreLabel(tile.label)}
                    </Link>
                  </div>
                ) : (
                  // The whole strip opens it: one big target, pointer cursor.
                  <button
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    aria-expanded={false}
                    aria-label={tile.label}
                    className="absolute inset-0 flex cursor-pointer items-end p-3"
                  >
                    <span className="w-full truncate rounded-2xl border border-border bg-card px-2 py-2.5 text-sm font-bold text-foreground transition-transform duration-300 ease-[var(--ease-bounce)] group-hover:-translate-y-1">
                      {tile.label}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
