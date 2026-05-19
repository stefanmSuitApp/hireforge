import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function AuthGatewayEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
      <Sparkles className="size-3.5" />
      {children}
    </p>
  );
}

type PanelWidth = 'md' | '2xl';

const panelMaxWidth: Record<PanelWidth, string> = {
  md: 'max-w-md',
  '2xl': 'max-w-2xl',
};

export type AuthFormGatewayProps = {
  eyebrowText: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Default narrow panel; use `2xl` for long signup flows. */
  panelWidth?: PanelWidth;
  panelClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Centered auth copy + solid form panel (no gradients). Use inside
 * {@link AuthPublicGradientShell}.
 */
export function AuthFormGateway({
  eyebrowText,
  title,
  subtitle,
  panelWidth = 'md',
  panelClassName,
  children,
  footer,
}: AuthFormGatewayProps) {
  return (
    <div className="relative mx-auto max-w-3xl">
      <header className="mx-auto max-w-xl text-center">
        <AuthGatewayEyebrow>{eyebrowText}</AuthGatewayEyebrow>
        <h1 className="mt-3 text-[clamp(1.7rem,4.8vw,2.6rem)] font-extrabold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
            {subtitle}
          </p>
        ) : null}
      </header>

      <div
        className={cn(
          'mx-auto mt-8 w-full rounded-2xl border border-border/40 bg-card/80 p-5 shadow-sm backdrop-blur-sm',
          panelMaxWidth[panelWidth],
          panelWidth === '2xl' && 'md:p-6',
          panelClassName,
        )}
      >
        {children}
      </div>

      {footer}
    </div>
  );
}
