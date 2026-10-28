// Renders client components the way the app does: Serbian messages from
// src/messages/sr.json, a fresh React Query client, Europe/Belgrade.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';
import messages from '../messages/sr.json';

export { messages };

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <NextIntlClientProvider
      locale="sr"
      messages={messages}
      timeZone="Europe/Belgrade"
    >
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </NextIntlClientProvider>
  );
}

export const renderApp = (ui: ReactElement) =>
  render(ui, { wrapper: Providers });
export const renderAppHook = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: Providers });
