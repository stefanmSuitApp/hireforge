import { AsyncLocalStorage } from 'async_hooks';

export type CorrelationStore = { correlationId: string };

export const correlationStorage = new AsyncLocalStorage<CorrelationStore>();

export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}
