/** Sent on every API-bound fetch so logs can be correlated across web → Nest. */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Optional secondary header some gateways use; API accepts either. */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

export function createRequestId(): string {
  return globalThis.crypto.randomUUID();
}
