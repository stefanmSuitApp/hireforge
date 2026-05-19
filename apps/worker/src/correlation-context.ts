import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

type CorrelationStore = { correlationId: string };

const correlationStorage = new AsyncLocalStorage<CorrelationStore>();

export function getWorkerCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}

/**
 * Runs `fn` with a correlation id (from the BullMQ job payload when present).
 * Used so worker structured logs can include the same id as the originating API request.
 */
export function runWithCorrelationId<T>(
  requestCorrelationId: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const correlationId = requestCorrelationId?.trim() || randomUUID();
  return correlationStorage.run({ correlationId }, fn);
}
