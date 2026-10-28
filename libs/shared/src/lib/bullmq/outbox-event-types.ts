/**
 * `outbox_events.event_type` values written by the API (keep in sync with Nest inserts).
 */
export const OUTBOX_EVENT_TYPES = [
  'job_submitted',
  'job_published',
  'job_rejected',
  'job_unpublished',
  'job_force_archived',
  'job_expired',
  'job_expiring_soon',
  'application_submitted',
  'proforma_issued',
  'invoice_issued',
  'company_join_request_decided',
] as const;

export type OutboxEventType = (typeof OUTBOX_EVENT_TYPES)[number];

export function isKnownOutboxEventType(
  value: string,
): value is OutboxEventType {
  return (OUTBOX_EVENT_TYPES as readonly string[]).includes(value);
}
