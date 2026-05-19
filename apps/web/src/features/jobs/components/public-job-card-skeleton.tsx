import { cn } from '@/lib/cn';

/**
 * Card body height aligned with {@link PublicJobCard} (incl. typical chip row).
 * List row size adds `pb-3` (12px) in the virtualizer estimate.
 */
export const PUBLIC_JOB_CARD_ESTIMATE_PX = 168;

type Props = {
  className?: string;
};

/**
 * Layout mirrors {@link PublicJobCard}: same border, padding, flex row, chip row heights.
 */
export function PublicJobCardSkeleton({ className }: Props) {
  return (
    <article
      aria-hidden
      className={cn(
        'pointer-events-none relative h-[168px] overflow-hidden rounded-2xl border border-border/60 bg-card p-5',
        className,
      )}
    >
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 h-[1.375rem] w-[88%] max-w-xl rounded-md bg-muted/50" />
          <div className="h-5 w-[70%] max-w-md rounded-md bg-muted/40" />
          <div className="mt-1 h-4 w-[45%] rounded-md bg-muted/35" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            <div className="h-6 w-[4.5rem] rounded-full bg-muted/40" />
            <div className="h-6 w-[3.25rem] rounded-full bg-muted/40" />
            <div className="h-6 w-[3.75rem] rounded-full bg-muted/40" />
          </div>
        </div>
        <div className="size-10 shrink-0 rounded-lg bg-muted/35" />
      </div>
    </article>
  );
}
