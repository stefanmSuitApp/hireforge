export const PlatformJobName = {
  IntegrationPing: 'integration-ping',
  /** One BullMQ job per outbox row. */
  OutboxDispatch: 'outbox-dispatch',
  /** Repeatable platform tick (groundwork: expirations, digests). */
  ScheduledTick: 'scheduled-tick',
  /** Nightly (or configured interval) reconcile of `packageDefinition` docs from Sanity → Postgres. */
  CmsPackagesReconcile: 'cms-packages-reconcile',
  /** Refresh NBS EUR/RSD middle rate in Redis (Step 9.3); default 24h. */
  NbsMiddleRateRefresh: 'nbs-middle-rate-refresh',
  /** One email notification per notifiable outbox event (retried; Resend-idempotent). */
  NotificationEmail: 'notification-email',
} as const;

export type PlatformJobName =
  (typeof PlatformJobName)[keyof typeof PlatformJobName];

export function isPlatformJobName(value: string): value is PlatformJobName {
  return (Object.values(PlatformJobName) as string[]).includes(value);
}
