import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/** Bare text input for a `SearchField`: the card draws the box. */
export const searchFieldInputClass =
  'min-w-0 bg-transparent py-1 text-base text-foreground outline-none placeholder:text-muted-foreground';

/** Trigger classes for a Combobox / SelectField inside a `SearchField`. */
export const searchFieldTriggerClass =
  'h-8 w-full border-0 bg-transparent px-0 text-left text-base font-normal shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-base';

/**
 * Redesign A search card (home hero, /jobs, landings): one white card that
 * wraps. Fields share a row with thin dividers; the button drops below on
 * its own when the row is too narrow for everything.
 */
export function SearchCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-2 rounded-[24px] border border-border bg-card p-2.5 shadow-[0_24px_60px_-30px_oklch(0.34_0.06_182_/_0.45)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A labelled field; `divider` draws the line to the previous field. */
export function SearchField({
  label,
  htmlFor,
  basis,
  divider = false,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  /** flex-basis class, e.g. `flex-[2_1_240px]`. */
  basis: string;
  divider?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col justify-center px-3.5 py-2 focus-within:bg-muted/60',
        basis,
        divider
          ? 'border-t border-border sm:border-l sm:border-t-0'
          : 'rounded-2xl',
      )}
    >
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
