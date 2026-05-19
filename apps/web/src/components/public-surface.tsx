import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** Shared outer wrapper for marketing-style public routes (discovery, editorial, directory). */
export function PublicSurfaceMain({
  className,
  narrow,
  ...rest
}: HTMLAttributes<HTMLElement> & { narrow?: boolean }) {
  return (
    <main
      className={cn(
        'mx-auto px-4 py-12 pb-16 md:py-14',
        narrow ? 'max-w-3xl' : 'max-w-6xl',
        className,
      )}
      {...rest}
    />
  );
}
