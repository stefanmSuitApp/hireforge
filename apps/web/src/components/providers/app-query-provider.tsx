'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createBrowserQueryClient } from '@/lib/query/create-query-client';

export function AppQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createBrowserQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
