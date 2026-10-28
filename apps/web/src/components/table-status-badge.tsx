import { cn } from '@/lib/utils';

export type TableStatusTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

const toneClass: Record<TableStatusTone, string> = {
  neutral: 'border-border/80 bg-muted/60 text-foreground dark:bg-muted/40',
  info: 'border-info/30 bg-info-soft text-info',
  success: 'border-success/30 bg-success-soft text-success',
  warning: 'border-warning/30 bg-warning-soft text-warning',
  danger: 'border-destructive/30 bg-destructive-soft text-destructive',
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

export function staffSalesStatusTone(status: string): TableStatusTone {
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
