'use client';

import { useLocale } from 'next-intl';
import * as React from 'react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import type { HomeJobsSpotlightTile } from '@/lib/home-jobs-discovery';

type Props = {
  title: string;
  titleAccent?: string;
  subtitle: string;
  tiles: HomeJobsSpotlightTile[];
  initialOpenIndex?: number;
  className?: string;
  /** Button label prefix, e.g. "Explore" → "Explore IT" */
  exploreLabelPrefix?: string;
  isAuthenticated?: boolean;
};

const GRADIENT_PALETTES = [
  'from-teal-600 via-teal-700 to-teal-900',
  'from-cyan-600 via-cyan-700 to-cyan-900',
  'from-emerald-600 via-emerald-700 to-emerald-900',
  'from-teal-700 via-emerald-800 to-teal-900',
  'from-cyan-700 via-teal-800 to-cyan-900',
  'from-teal-600 via-cyan-700 to-emerald-900',
  'from-emerald-700 via-teal-700 to-cyan-900',
  'from-cyan-600 via-emerald-700 to-teal-900',
  'from-teal-800 via-teal-600 to-emerald-800',
  'from-emerald-600 via-cyan-700 to-teal-800',
];

export function HomeSpotlightRail({
  title,
  titleAccent,
  subtitle,
  tiles,
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
    const clampedIdx = Math.max(0, Math.min(initialOpenIndex, tiles.length - 1));
    setActiveIdx(clampedIdx);
  }, [initialOpenIndex, tiles.length]);

  if (tiles.length === 0) return null;

  function tileHref(jobsHref: string): string {
    return isAuthenticated
      ? jobsHref
      : `/sign-in?returnTo=${encodeURIComponent(`/${locale}${jobsHref}`)}`;
  }

  return (
    <section className={cn('', className)} aria-labelledby={headingId}>
      <div className="mb-8">
        <h2
          id={headingId}
          className="m-0 text-2xl font-bold tracking-tight text-foreground md:text-4xl"
        >
          {titleAccent ? (
            <>
              {title.replace(titleAccent, '')}{' '}
              <span className="hf-gradient-text">{titleAccent}</span>
            </>
          ) : (
            title
          )}
        </h2>
        <p className="m-0 mt-2 max-w-xl text-base leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>

      {/* Mobile: vertical accordion cards */}
      <div className="space-y-3 md:hidden">
        {tiles.map((tile, idx) => {
          const isOpen = idx === activeIdx;
          return (
            <article
              key={`${tile.slug}-${idx}`}
              className={cn(
                'overflow-hidden rounded-2xl border border-border/60 bg-card/80 transition-colors',
                isOpen ? 'border-primary/35' : 'hover:border-border',
              )}
            >
              <button
                type="button"
                onClick={() => setActiveIdx(idx)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
                aria-expanded={isOpen}
                aria-controls={`${headingId}-mobile-panel-${idx}`}
              >
                <span className="text-base font-semibold text-foreground">{tile.label}</span>
                <span className="text-sm font-semibold text-primary">
                  {isOpen ? '−' : '+'}
                </span>
              </button>

              {isOpen ? (
                <div id={`${headingId}-mobile-panel-${idx}`} className="px-4 pb-4">
                  <div className="relative mb-3 h-40 overflow-hidden rounded-xl">
                    {tile.imageUrl ? (
                      <img
                        src={tile.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div
                        className={cn(
                          'flex h-full w-full items-center justify-center bg-gradient-to-br',
                          GRADIENT_PALETTES[idx % GRADIENT_PALETTES.length],
                        )}
                      >
                        <span className="select-none text-5xl font-bold text-white/60">
                          {tile.label.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    href={tileHref(tile.jobsHref)}
                    className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background no-underline transition-colors hover:bg-foreground/85"
                  >
                    {exploreLabelPrefix
                      ? `${exploreLabelPrefix} ${tile.label}`
                      : tile.label}
                  </Link>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {/* Horizontal accordion container */}
      <div className="hidden h-[320px] gap-1.5 overflow-hidden rounded-2xl bg-muted/40 p-3 md:flex md:h-[380px]">
        {tiles.map((tile, idx) => {
          const isOpen = idx === activeIdx;
          return (
            <div
              key={`${tile.slug}-${idx}`}
              className={cn(
                'relative flex cursor-pointer overflow-hidden rounded-xl bg-card transition-all duration-500 ease-in-out',
                isOpen
                  ? 'flex-[3] md:flex-[4]'
                  : 'flex-[0.5] hover:bg-muted/60 md:flex-[0.4]',
              )}
              onClick={() => setActiveIdx(idx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveIdx(idx);
                }
              }}
              aria-expanded={isOpen}
              aria-label={tile.label}
            >
              {isOpen ? (
                /* Expanded card: image + label + button */
                <div className="flex h-full w-full flex-col">
                  <div className="relative flex-1 overflow-hidden">
                    {tile.imageUrl ? (
                      <img
                        src={tile.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div
                        className={cn(
                          'flex h-full w-full items-center justify-center bg-gradient-to-br',
                          GRADIENT_PALETTES[idx % GRADIENT_PALETTES.length],
                        )}
                      >
                        <span className="select-none text-6xl font-bold text-white/60">
                          {tile.label.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-base font-bold text-foreground md:text-lg">
                      {tile.label}
                    </span>
                    <Link
                      href={tileHref(tile.jobsHref)}
                      className="shrink-0 rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background no-underline transition-colors hover:bg-foreground/80 md:text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {exploreLabelPrefix
                        ? `${exploreLabelPrefix} ${tile.label}`
                        : tile.label}
                    </Link>
                  </div>
                </div>
              ) : (
                /* Collapsed card: vertical text */
                <div className="flex h-full w-full items-center justify-center">
                  <span className="whitespace-nowrap text-base font-semibold text-muted-foreground [writing-mode:vertical-lr] [transform:rotate(180deg)]">
                    {tile.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
