import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type WorkspaceNavLink = { href: string; label: string; active: boolean };

type Props = {
  ariaLabel: string;
  /** Link groups, separated by a divider (e.g. moderator | admin). */
  groups: WorkspaceNavLink[][];
};

/** The sticky pill nav of a signed-in area. */
export function WorkspaceNav({ ariaLabel, groups }: Props) {
  return (
    <nav
      aria-label={ariaLabel}
      className="sticky top-16 z-20 -mx-4 my-8 border-y border-border bg-background/95 px-4 py-2 backdrop-blur"
    >
      <div className="flex flex-wrap gap-2">
        {groups.map((links, i) => (
          <div key={i} className="contents">
            {i > 0 ? (
              <span
                aria-hidden="true"
                className="mx-1 self-stretch border-l border-border"
              />
            ) : null}
            {links.map(({ href, label, active }) => (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors md:min-h-9',
                  active
                    ? 'bg-foreground text-background'
                    : 'border border-border bg-card text-foreground hover:bg-muted',
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}
