'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { foldSerbianLatinSearchKey } from '@/lib/serbian-latin-search-fold';
import { cn } from '@/lib/utils';

import type { ComboboxOption } from './combobox';

function serbianLatinCmdkFilter(
  value: string,
  search: string,
  keywords?: string[],
): number {
  const foldedSearch = foldSerbianLatinSearchKey(search).trim();
  if (!foldedSearch) {
    return 1;
  }
  const haystack = [value, ...(keywords ?? [])]
    .map((s) => foldSerbianLatinSearchKey(s))
    .join(' ');
  const tokens = foldedSearch.split(/\s+/).filter(Boolean);
  const matches = tokens.every((t) => haystack.includes(t));
  return matches ? 1 : 0;
}

export type MultiComboboxProps = {
  /** Selected option values (e.g. taxonomy slugs). */
  values: string[];
  onValuesChange: (next: string[]) => void;
  options: ComboboxOption[];
  /** Button text when nothing is selected (e.g. “Any category”). */
  placeholder: string;
  /** Precomputed summary for the trigger (labels / count). */
  triggerLabel: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-invalid'?: boolean;
};

/**
 * Multi-select popover list (Radix Popover + cmdk), styled like {@link Combobox}.
 * Stays open while toggling items; closes when clicking outside.
 */
export function MultiCombobox({
  values,
  onValuesChange,
  options,
  placeholder,
  triggerLabel,
  searchPlaceholder = 'Search…',
  emptyText = 'No results.',
  disabled,
  className,
  id,
  'aria-invalid': ariaInvalid,
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const toggle = React.useCallback(
    (slug: string) => {
      if (values.includes(slug)) {
        onValuesChange(values.filter((v) => v !== slug));
      } else {
        onValuesChange([...values, slug]);
      }
    },
    [values, onValuesChange],
  );

  const buttonText = values.length === 0 ? placeholder : triggerLabel;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className={cn('h-10 w-full justify-between font-normal', className)}
        >
          <span className="truncate text-left">{buttonText}</span>
          <ChevronsUpDown
            className="ml-2 size-4 shrink-0 opacity-50"
            aria-hidden
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter filter={serbianLatinCmdkFilter}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const checked = values.includes(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    keywords={opt.keywords}
                    onSelect={() => {
                      toggle(opt.value);
                    }}
                  >
                    <Check
                      className={cn(
                        'size-4',
                        checked ? 'opacity-100' : 'opacity-0',
                      )}
                      aria-hidden
                    />
                    {opt.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
