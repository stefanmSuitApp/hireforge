import type { ReactNode } from 'react';

type Props = {
  /** Small line above the title ("Kandidatski nalog", …). */
  label: string;
  /** Status pill next to the label. */
  badge?: string;
  title: string;
  subtitle?: string;
  /** Extra line under the subtitle (e.g. a link to the public profile). */
  meta?: ReactNode;
  /** Right-hand actions (e.g. staff sign-out). */
  actions?: ReactNode;
  /** Notice between the header and the nav (e.g. verify your email). */
  banner?: ReactNode;
  nav: ReactNode;
  children: ReactNode;
};

/** One layout for every signed-in area: header card, sticky nav, page. */
export function WorkspaceShell({
  label,
  badge,
  title,
  subtitle,
  meta,
  actions,
  banner,
  nav,
  children,
}: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 text-sm font-medium text-primary">{label}</p>
            <h1 className="m-0 mt-3 text-h2 break-words text-foreground">
              {title}
            </h1>
            {subtitle ? (
              <p className="m-0 mt-1 text-sm text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
            {meta ? <div className="mt-2 text-sm">{meta}</div> : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {badge ? (
              <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                {badge}
              </span>
            ) : null}
            {actions}
          </div>
        </div>
      </div>
      {banner}
      {nav}
      <main>{children}</main>
    </div>
  );
}
