'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';
import { Dropdown as RDPDropdown, UI, useDayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';

export type CalendarCaptionDropdownProps = React.ComponentProps<typeof RDPDropdown>;

function emitNativeSelectChange(
  handler: React.ChangeEventHandler<HTMLSelectElement> | undefined,
  value: string,
) {
  if (!handler) return;
  handler({
    target: { value },
    currentTarget: { value },
  } as React.ChangeEvent<HTMLSelectElement>);
}

/** Props DayPicker passes through that must not reach the Radix trigger (wrong element type / internal API). */
const DROPDOWN_TRIGGER_EXCLUDE = new Set([
  'options',
  'className',
  'classNames',
  'components',
  'disabled',
  'value',
  'onChange',
  'style',
  'aria-label',
]);

function selectTriggerPassthrough(
  props: CalendarCaptionDropdownProps,
): React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> {
  const raw = { ...(props as unknown as Record<string, unknown>) };
  for (const key of DROPDOWN_TRIGGER_EXCLUDE) {
    delete raw[key];
  }
  return raw as React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>;
}

/**
 * Radix-based replacement for react-day-picker's default {@link RDPDropdown}.
 * The stock dropdown uses a transparent native `<select>` (`.rdp-dropdown`) plus a
 * decorative label; that breaks layout in popovers, produces huge native year menus,
 * and triggers awkward focus outlines on the caption.
 */
export function CalendarCaptionDropdown(props: CalendarCaptionDropdownProps) {
  const { classNames } = useDayPicker();
  const {
    options,
    className,
    disabled,
    value,
    onChange,
    style,
    'aria-label': ariaLabel,
  } = props;

  const opts = options ?? [];
  const stringValue = value !== undefined && value !== null ? String(value) : '';

  const triggerPassthrough = selectTriggerPassthrough(props);

  return (
    <span
      data-disabled={disabled ? 'true' : undefined}
      className={cn(classNames[UI.DropdownRoot], 'inline-flex')}
      style={style}
    >
      <SelectPrimitive.Root
        value={stringValue}
        onValueChange={(v) => emitNativeSelectChange(onChange, v)}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          {...triggerPassthrough}
          aria-label={ariaLabel}
          className={cn(
            // Do not merge `classNames[UI.Dropdown]` (`rdp-dropdown`): it forces opacity:0 + absolute fill.
            'flex h-9 min-w-[6.75rem] shrink-0 items-center justify-between gap-1 rounded-md border border-input bg-background px-2 py-1 text-sm font-medium text-foreground shadow-none outline-none transition-colors',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <SelectPrimitive.Value placeholder={opts.find((o) => o.value === value)?.label} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-[100] max-h-[min(280px,var(--radix-select-content-available-height))] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in',
              'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            )}
            position="popper"
            sideOffset={4}
            align="start"
            collisionPadding={12}
          >
            <SelectPrimitive.Viewport className="max-h-[min(272px,var(--radix-select-content-available-height))] overflow-y-auto p-1">
              {opts.map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={String(opt.value)}
                  disabled={opt.disabled}
                  className={cn(
                    'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none',
                    'focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  )}
                >
                  <span className="absolute right-2 flex size-3.5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="size-4 text-primary" aria-hidden />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </span>
  );
}
