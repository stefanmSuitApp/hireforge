'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Side panel on Radix Dialog: focus trap, Escape, scroll lock and focus
 * return come with it. Used for the phone menu (and later filters).
 */
const Sheet = DialogPrimitive.Root;

const SheetTrigger = DialogPrimitive.Trigger;

const SheetClose = DialogPrimitive.Close;

const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

type SheetContentProps = React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> & {
  side?: 'right' | 'bottom';
  /** Accessible name of the close button. */
  closeLabel: string;
};

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', closeLabel, className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex flex-col gap-4 overflow-y-auto bg-background p-4 shadow-lg outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:duration-200 data-[state=open]:duration-300',
        side === 'right' &&
          'inset-y-0 right-0 h-full w-[min(20rem,85vw)] border-l border-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
        side === 'bottom' &&
          'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t border-border data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={closeLabel}
      >
        <X className="size-5" aria-hidden />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('m-0 text-base font-semibold text-foreground', className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = DialogPrimitive.Description;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
};
