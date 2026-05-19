'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

export type SiteNavItem = {
  href: string;
  label: string;
  external?: boolean;
};

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteMainNav({
  items,
  ariaLabel,
}: {
  items: SiteNavItem[];
  ariaLabel: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      className="flex items-center gap-1 rounded-full border border-border/40 bg-card/50 p-1"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const active = isNavActive(pathname, item.href);
        const className = cn(
          'relative rounded-full px-4 py-1.5 text-sm font-medium transition-all',
          active
            ? 'bg-foreground text-background shadow-sm'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        );

        return item.external ? (
          <a
            key={`${item.label}-${item.href}`}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className={className}
          >
            {item.label}
          </a>
        ) : (
          <Link
            key={`${item.label}-${item.href}`}
            href={item.href}
            className={className}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
