import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  /** Applied to the inner max-width wrapper (padding, extra bottom space, etc.). */
  contentClassName?: string;
};

/**
 * Full-width auth/marketing backdrop: page-level gradient and hero orbs.
 * Form panels should stay non-gradient; compose them inside this shell.
 */
export function AuthPublicGradientShell({
  children,
  className,
  contentClassName,
}: Props) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-gradient-to-b from-primary/[0.08] via-cyan-500/[0.04] to-background',
        className,
      )}
    >
      <div
        className="hf-hero-orb -left-20 top-0 size-[340px] bg-primary/20"
        aria-hidden
      />
      <div
        className="hf-hero-orb -right-20 bottom-0 size-[360px] bg-cyan-400/20"
        aria-hidden
      />
      <div
        className={cn(
          'mx-auto max-w-6xl px-4 py-10 md:py-14',
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
