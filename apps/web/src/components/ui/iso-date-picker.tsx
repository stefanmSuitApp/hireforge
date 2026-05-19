'use client';

import { format, isValid, parse } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { srLatn } from 'date-fns/locale/sr-Latn';
import { CalendarIcon, X } from 'lucide-react';
import { useLocale } from 'next-intl';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const ISO = 'yyyy-MM-dd';

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function parseIso(value: string): Date | undefined {
  const v = value.trim();
  if (!v) return undefined;
  const d = parse(v, ISO, new Date());
  return isValid(d) ? d : undefined;
}

/** Props for {@link IsoDatePicker}. Value is always `YYYY-MM-DD` or empty. */
export type IsoDatePickerProps = {
  id?: string;
  /** `YYYY-MM-DD` or empty string */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** When true (default), shows a clear control when a date is selected. */
  allowClear?: boolean;
  /** Label for the clear control (visible text + accessible name). */
  clearLabel?: string;
  fromDate?: Date;
  toDate?: Date;
  'aria-invalid'?: boolean;
};

/**
 * Popover calendar for **`YYYY-MM-DD`** strings (matches contracts + `<input type="date">`).
 * Import from the barrel: `import { IsoDatePicker } from '@/components/ui'`.
 */
export function IsoDatePicker({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  className,
  allowClear = true,
  clearLabel = 'Clear',
  fromDate,
  toDate,
  'aria-invalid': ariaInvalid,
}: IsoDatePickerProps) {
  const loc = useLocale();
  const locale = loc === 'sr' ? srLatn : enUS;
  const [open, setOpen] = React.useState(false);
  const selected = parseIso(value);

  const label = selected
    ? format(selected, 'PPP', { locale })
    : (placeholder ?? '');

  const startMonth = fromDate ? startOfMonth(fromDate) : undefined;
  const endMonth = toDate ? startOfMonth(toDate) : undefined;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={ariaInvalid}
            className={cn(
              'h-9 min-w-0 flex-1 justify-start text-left font-normal sm:min-w-[10rem]',
              !selected && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 size-4 shrink-0 opacity-60" />
            <span className="truncate">{label}</span>
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-auto border-border p-0 shadow-md" align="start">
        <Calendar
          className="border-0 shadow-none"
          mode="single"
          selected={selected}
          defaultMonth={selected}
          startMonth={startMonth}
          endMonth={endMonth}
          onSelect={(d) => {
            onChange(d ? format(d, ISO) : '');
            setOpen(false);
          }}
          disabled={
            fromDate && toDate
              ? [{ before: fromDate }, { after: toDate }]
              : fromDate
                ? { before: fromDate }
                : toDate
                  ? { after: toDate }
                  : undefined
          }
        />
        </PopoverContent>
      </Popover>
      {allowClear && selected ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-1.5 px-2.5 text-muted-foreground"
          disabled={disabled}
          aria-label={clearLabel}
          title={clearLabel}
          onClick={() => onChange('')}
        >
          <X className="size-4 shrink-0" aria-hidden />
          <span>{clearLabel}</span>
        </Button>
      ) : null}
    </div>
  );
}
