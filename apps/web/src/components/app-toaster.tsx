'use client';

import { Toaster } from 'sonner';

/** Global toast host — use `toast` from `sonner` in client components. */
export function AppToaster() {
  return <Toaster richColors closeButton position="bottom-right" />;
}
