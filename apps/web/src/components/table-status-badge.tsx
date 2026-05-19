import { cn } from '@/lib/utils';

export type TableStatusTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

const toneClass: Record<TableStatusTone, string> = {
  neutral:
    'border-border/80 bg-muted/60 text-foreground dark:bg-muted/40',
  info: 'border-primary/35 bg-primary/10 text-primary',
  success:
    'border-emerald-600/25 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/30 dark:text-emerald-100',
  warning:
    'border-amber-600/35 bg-amber-500/10 text-amber-950 dark:border-amber-500/35 dark:text-amber-100',
  danger:
    'border-destructive/35 bg-destructive/10 text-destructive',
};

type Props = {
  label: string;
  tone: TableStatusTone;
  className?: string;
};

export function TableStatusBadge({ label, tone, className }: Props) {
  const normalizedLabel = label.trim();
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums',
        toneClass[tone],
        className,
      )}
    >
      {normalizedLabel}
    </span>
  );
}

export function jobListingStatusTone(status: string): TableStatusTone {
  switch (status) {
    case 'published':
      return 'success';
    case 'submitted':
      return 'info';
    case 'rejected':
      return 'danger';
    case 'expired':
      return 'warning';
    case 'archived':
    case 'draft':
    default:
      return 'neutral';
  }
}

export function applicationPipelineStatusTone(status: string): TableStatusTone {
  switch (status) {
    case 'hired':
    case 'shortlisted':
      return 'success';
    case 'rejected':
    case 'withdrawn':
      return 'danger';
    case 'submitted':
    case 'reviewed':
      return 'info';
    case 'viewed':
    default:
      return 'neutral';
  }
}

export function staffSalesStatusTone(
  status: string,
): TableStatusTone {
  switch (status) {
    case 'closed_won':
      return 'success';
    case 'closed_lost':
      return 'danger';
    case 'pipeline':
      return 'info';
    case 'unassigned':
    default:
      return 'neutral';
  }
}
