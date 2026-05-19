/**
 * Stable BullMQ `jobId` for an outbox row. Must not contain `:` (BullMQ / Redis key rules).
 */
export function outboxDispatchBullmqJobId(outboxEventId: number): string {
  return `outbox-${outboxEventId}`;
}
