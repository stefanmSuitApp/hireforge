'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { foldSerbianLatinSearchKey } from '@/lib/serbian-latin-search-fold';
import { cn } from '@/lib/utils';

/**
 * cmdk’s built-in filter is fuzzy (letters can match out of order), which is wrong for
 * place names — e.g. "kladovo" matched "Veliko Gradište". We use substring match on
 * folded text instead (same folding as search input).
 */
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

export type ComboboxOption = {
  value: string;
  label: string;
  /** Extra strings for cmdk fuzzy matching */
  keywords?: string[];
};

export type ComboboxGroupSection = {
  heading: string;
  options: ComboboxOption[];
};

type ComboboxSharedProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  /** Shown on the trigger when nothing selected */
  placeholder?: string;
  /** Search field placeholder inside the popover */
  searchPlaceholder?: string;
  /** No-results message */
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  'aria-invalid'?: boolean;
  /**
   * When set, called after `searchDebounceMs` as the user types in the list search field.
   * Turns off cmdk client filtering (`shouldFilter={false}`) — update `options` / `groups`
   * from your request (server or client fetch). Omit for local filtering only (default).
   */
  onSearchChange?: (query: string) => void;
  /** Debounce for `onSearchChange` in ms. Default `300`. Ignored when `onSearchChange` is omitted. */
  searchDebounceMs?: number;
};

export type ComboboxProps = ComboboxSharedProps &
  (
    | {
        /** Single flat list */
        options: ComboboxOption[];
        groups?: never;
        leadingOptions?: never;
      }
    | {
        options?: never;
        /** Sections with headings (e.g. districts); use `leadingOptions` for an “any” row */
        groups: ComboboxGroupSection[];
        leadingOptions?: ComboboxOption[];
      }
  );

/**
 * Autocomplete list built from Radix Popover + cmdk Command (shadcn pattern).
 * Pass translated `placeholder`, `searchPlaceholder`, and `emptyText` from the feature layer.
 *
 * Default: client-side substring filter with Serbian Latin folding. Optional `onSearchChange`
 * (debounced) disables that filter so you can drive `options`/`groups` from a server or async search.
 */
export function Combobox(props: ComboboxProps) {
  const {
    value,
    onValueChange,
    placeholder = 'Select…',
    searchPlaceholder = 'Search…',
    emptyText = 'No results.',
    disabled,
    className,
    id,
    name,
    'aria-invalid': ariaInvalid,
    onSearchChange,
    searchDebounceMs = 300,
  } = props;

  const serverDrivenSearch = typeof onSearchChange === 'function';
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  React.useEffect(
    () => () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    },
    [],
  );

  const handleSearchInputChange = React.useCallback(
    (query: string) => {
      if (!onSearchChange) return;
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchDebounceRef.current = setTimeout(() => {
        searchDebounceRef.current = null;
        onSearchChange(query);
      }, searchDebounceMs);
    },
    [onSearchChange, searchDebounceMs],
  );

  const isGrouped = 'groups' in props && props.groups != null;
  const groups = isGrouped ? props.groups : undefined;
  const leadingOptions = isGrouped ? props.leadingOptions : undefined;
  const flatOptions = !isGrouped ? props.options : undefined;

  const allOptions = React.useMemo(() => {
    if (isGrouped && groups) {
      return [...(leadingOptions ?? []), ...groups.flatMap((g) => g.options)];
    }
    return flatOptions ?? [];
  }, [isGrouped, groups, leadingOptions, flatOptions]);

  const [open, setOpen] = React.useState(false);
  const selected = allOptions.find((o) => o.value === value);

  const renderItem = (opt: ComboboxOption) => (
    <CommandItem
      key={opt.value}
      value={opt.value}
      keywords={opt.keywords}
      onSelect={() => {
        onValueChange?.(opt.value);
        setOpen(false);
      }}
    >
      <Check
        className={cn(
          'size-4',
          value === opt.value ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden
      />
      {opt.label}
    </CommandItem>
  );

  return (
    <>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={value ?? ''}
          readOnly
          aria-hidden
        />
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-invalid={ariaInvalid}
            disabled={disabled}
            className={cn(
              'inline-flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-base font-normal text-foreground ring-offset-background',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none md:text-sm',
              className,
            )}
          >
            <span
              className={cn(
                'truncate',
                !selected && 'text-muted-foreground',
              )}
            >
              {selected ? selected.label : placeholder}
            </span>
            <ChevronsUpDown
              className="ml-2 size-4 shrink-0 opacity-50"
              aria-hidden
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command
            shouldFilter={!serverDrivenSearch}
            filter={serverDrivenSearch ? undefined : serbianLatinCmdkFilter}
          >
            <CommandInput
              placeholder={searchPlaceholder}
              onValueChange={
                serverDrivenSearch ? handleSearchInputChange : undefined
              }
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              {isGrouped && groups ? (
                <>
                  {leadingOptions && leadingOptions.length > 0 ? (
                    <CommandGroup>
                      {leadingOptions.map(renderItem)}
                    </CommandGroup>
                  ) : null}
                  {(leadingOptions?.length ?? 0) > 0 && groups.length > 0 ? (
                    <CommandSeparator />
                  ) : null}
                  {groups.map((section, i) => (
                    <React.Fragment key={`${section.heading}-${i}`}>
                      {i > 0 ? <CommandSeparator /> : null}
                      <CommandGroup heading={section.heading}>
                        {section.options.map(renderItem)}
                      </CommandGroup>
                    </React.Fragment>
                  ))}
                </>
              ) : (
                <CommandGroup>
                  {(flatOptions ?? []).map(renderItem)}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
