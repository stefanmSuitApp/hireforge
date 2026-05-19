'use client';

import 'react-day-picker/style.css';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';

import { CalendarCaptionDropdown } from '@/components/ui/calendar-caption-dropdown';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Applied on the DayPicker root via inline `style` so they always win over
 * `react-day-picker/style.css` (which sets `--rdp-accent-color: blue` on `.rdp-root`).
 * Otherwise bundle order can leave chevrons, “today”, and selected rings blue/purple.
 */
const RDP_THEME_STYLE = {
  '--rdp-accent-color': 'var(--primary)',
  '--rdp-accent-background-color': 'var(--accent)',
  '--rdp-today-color': 'var(--primary)',
  '--rdp-selected-border': '2px solid var(--primary)',
  '--rdp-range_start-color': 'var(--primary-foreground)',
  '--rdp-range_end-color': 'var(--primary-foreground)',
  '--rdp-range_start-date-background-color': 'var(--primary)',
  '--rdp-range_end-date-background-color': 'var(--primary)',
} as React.CSSProperties;

/**
 * react-day-picker v9 + default stylesheet.
 */
export function Calendar({
  className,
  classNames,
  captionLayout = 'dropdown',
  reverseYears = true,
  ...props
}: CalendarProps) {
  const { style: incomingStyle, ...restProps } = props;

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-popover p-3 shadow-md',
        className,
      )}
    >
      <DayPicker
        {...restProps}
        captionLayout={captionLayout}
        reverseYears={reverseYears}
        style={{
          ...RDP_THEME_STYLE,
          ...incomingStyle,
        }}
        components={{
          ...restProps.components,
          Dropdown: CalendarCaptionDropdown,
        }}
        classNames={{
          ...classNames,
          root: cn(
            'rdp-root mx-auto w-fit',
            /* Focus rings: avoid browser default “system purple” on day/nav controls */
            '[&_.rdp-day_button:focus-visible]:outline-none [&_.rdp-day_button:focus-visible]:ring-2 [&_.rdp-day_button:focus-visible]:ring-ring [&_.rdp-day_button:focus-visible]:ring-offset-2 [&_.rdp-day_button:focus-visible]:ring-offset-background',
            '[&_.rdp-button_next:focus-visible]:outline-none [&_.rdp-button_next:focus-visible]:ring-2 [&_.rdp-button_next:focus-visible]:ring-ring [&_.rdp-button_next:focus-visible]:ring-offset-2 [&_.rdp-button_next:focus-visible]:ring-offset-background',
            '[&_.rdp-button_previous:focus-visible]:outline-none [&_.rdp-button_previous:focus-visible]:ring-2 [&_.rdp-button_previous:focus-visible]:ring-ring [&_.rdp-button_previous:focus-visible]:ring-offset-2 [&_.rdp-button_previous:focus-visible]:ring-offset-background',
            classNames?.root,
          ),
        }}
      />
    </div>
  );
}
