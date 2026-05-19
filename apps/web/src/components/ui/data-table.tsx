'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type TableOptions,
} from '@tanstack/react-table';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

export type DataTableColumn<TData> = {
  id: string;
  header: React.ReactNode;
  /** When set (and no `accessorFn`), the default cell stringifies this field. */
  accessorKey?: keyof TData & string;
  accessorFn?: (row: TData) => unknown;
  /** Overrides default cell rendering when provided. */
  cell?: (row: TData) => React.ReactNode;
};

export type DataTableClassNames = {
  /** Applied to the scroll/border wrapper around `<table>`. */
  root?: string;
  table?: string;
  caption?: string;
  headerRow?: string;
  head?: string;
  bodyRow?: string;
  cell?: string;
  emptyCell?: string;
};

export type DataTableProps<TData> = {
  data: TData[];
  columns: DataTableColumn<TData>[];
  caption?: React.ReactNode;
  /** Shown in a single full-width row when `data` is empty (header row still renders). */
  emptyContent?: React.ReactNode;
  getRowId?: (originalRow: TData, index: number) => string;
  classNames?: DataTableClassNames;
  /** Merged into TanStack Table (e.g. sorting, manualPagination). `data`, `columns`, `getCoreRowModel` are owned by this component. */
  tableOptions?: Partial<
    Omit<TableOptions<TData>, 'data' | 'columns' | 'getCoreRowModel'>
  >;
};

function buildColumnDefs<TData>(
  columns: DataTableColumn<TData>[],
): ColumnDef<TData>[] {
  return columns.map((col) => {
    const renderCell = col.cell;
    const defaultFromValue = (value: unknown) =>
      value == null ? '—' : String(value);
    const headerFn = () => col.header;

    if (col.accessorFn) {
      return {
        id: col.id,
        accessorFn: col.accessorFn,
        header: headerFn,
        cell: renderCell
          ? (ctx) => renderCell(ctx.row.original)
          : (ctx) => defaultFromValue(ctx.getValue()),
      } as ColumnDef<TData>;
    }

    if (col.accessorKey !== undefined) {
      return {
        id: col.id,
        accessorKey: col.accessorKey as string,
        header: headerFn,
        cell: renderCell
          ? (ctx) => renderCell(ctx.row.original)
          : (ctx) => defaultFromValue(ctx.getValue()),
      } as ColumnDef<TData>;
    }

    return {
      id: col.id,
      header: headerFn,
      cell: renderCell ? (ctx) => renderCell(ctx.row.original) : () => '—',
    } as ColumnDef<TData>;
  });
}

/**
 * Opinionated data table: passes columns + rows and renders TanStack Table with our `Table` primitives.
 * For full control, use `Table` + `useReactTable` + `flexRender` directly.
 */
function DataTable<TData>({
  data,
  columns: columnConfig,
  caption,
  emptyContent,
  getRowId,
  classNames,
  tableOptions,
}: DataTableProps<TData>) {
  const columns = useMemo(() => buildColumnDefs(columnConfig), [columnConfig]);

  const table = useReactTable<TData>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(getRowId != null
      ? {
          getRowId: (originalRow, index) =>
            getRowId(originalRow as TData, index),
        }
      : {}),
    ...tableOptions,
  });

  const colCount = columnConfig.length;
  const rows = table.getRowModel().rows;

  return (
    <Table
      outerClassName={classNames?.root}
      className={classNames?.table}
      caption={caption}
      captionClassName={classNames?.caption}
    >
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow
            key={headerGroup.id}
            className={cn(
              'border-0 hover:bg-transparent data-[state=selected]:bg-transparent',
              classNames?.headerRow,
            )}
          >
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} className={classNames?.head}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow className={classNames?.bodyRow}>
            <TableCell
              colSpan={Math.max(colCount, 1)}
              className={cn(
                'h-16 text-center text-muted-foreground',
                classNames?.emptyCell,
              )}
            >
              {emptyContent ?? '—'}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id} className={classNames?.bodyRow}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className={classNames?.cell}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export { DataTable };
