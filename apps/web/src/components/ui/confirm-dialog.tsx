'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';

import { Button } from './button';

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Irreversible actions get the destructive button. */
  destructive?: boolean;
};

/**
 * A styled, localized replacement for `window.confirm`:
 * `const [dialog, confirm] = useConfirm();` render `dialog`, then
 * `if (!(await confirm({...}))) return;`.
 */
export function useConfirm(): [
  React.ReactNode,
  (options: ConfirmOptions) => Promise<boolean>,
] {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolver = React.useRef<((ok: boolean) => void) | null>(null);

  const confirm = React.useCallback((next: ConfirmOptions) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function settle(ok: boolean) {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }

  const dialog = (
    <DialogPrimitive.Root
      open={options !== null}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          role="alertdialog"
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="m-0 text-h3 text-foreground">
            {options?.title}
          </DialogPrimitive.Title>
          {options?.description ? (
            <DialogPrimitive.Description className="m-0 mt-2 text-sm text-muted-foreground">
              {options.description}
            </DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">
              {options?.title}
            </DialogPrimitive.Description>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-0"
              onClick={() => settle(false)}
            >
              {options?.cancelLabel}
            </Button>
            <Button
              type="button"
              variant={options?.destructive ? 'destructive' : 'default'}
              className="min-h-11 sm:min-h-0"
              onClick={() => settle(true)}
            >
              {options?.confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );

  return [dialog, confirm];
}
