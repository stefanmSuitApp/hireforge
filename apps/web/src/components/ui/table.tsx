import * as React from 'react';

import { cn } from '@/lib/utils';

export type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  /** Renders a `<caption>` as the first child of `<table>` (valid placement for accessibility). */
  caption?: React.ReactNode;
  captionClassName?: string;
  /** Classes for the outer scroll/border wrapper (not the `<table>` element). */
  outerClassName?: string;
};

/**
 * Table primitives styled for Tailwind + shadcn patterns.
 * Intended for use with TanStack Table (`flexRender`, `getHeaderGroups`, `getRowModel`),
 * or the composed {@link DataTable} component.
 */
const Table = React.forwardRef<HTMLTableElement, TableProps>(
  (
    {
      className,
      caption,
      captionClassName,
      outerClassName,
      children,
      ...props
    },
    ref,
  ) => (
    <div
      className={cn(
        'relative w-full overflow-x-auto rounded-lg border border-border',
        outerClassName,
      )}
    >
      <table
        ref={ref}
        className={cn(
          'w-full min-w-[40rem] caption-bottom text-left text-sm',
          className,
        )}
        {...props}
      >
        {caption != null && caption !== false ? (
          <caption
            className={cn(
              'px-3 pb-2 pt-3 text-left text-sm text-muted-foreground',
              captionClassName,
            )}
          >
            {caption}
          </caption>
        ) : null}
        {children}
      </table>
    </div>
  ),
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      'border-b border-border bg-muted/40 text-muted-foreground',
      className,
    )}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t border-border bg-muted/50 font-medium [&>tr]:last:border-b-0',
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-border/80 transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted',
      className,
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'px-3 py-2 text-left align-middle text-sm font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
      className,
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'px-3 py-2 align-middle [&:has([role=checkbox])]:pr-0',
      className,
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-muted-foreground', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};
