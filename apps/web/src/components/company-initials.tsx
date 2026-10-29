import { cn } from '@/lib/cn';

/** Stand-in for a company logo until logos exist (docs/plans/REDESIGN_A.md). */
export function CompanyInitials({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .replace(/\b(d\.?\s?o\.?\s?o\.?|a\.?d\.?|doo|ad)\b/gi, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-placeholder text-sm font-bold text-placeholder-foreground',
        className,
      )}
    >
      {initials || '•'}
    </span>
  );
}
