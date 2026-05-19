import type { JobsOptions } from 'bullmq';

/**
 * Default options for domain jobs on the platform queue: bounded retries,
 * exponential backoff, bounded Redis retention for completed/failed jobs.
 */
export const DEFAULT_PLATFORM_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 500,
  removeOnFail: 200,
};

/**
 * Integration / health pings: single attempt, small retention (noise control).
 */
export const INTEGRATION_PING_JOB_OPTIONS: JobsOptions = {
  attempts: 1,
  removeOnComplete: 100,
  removeOnFail: 50,
};

/** Outbox dispatch: same retry/retention as default platform jobs. */
export const OUTBOX_DISPATCH_JOB_OPTIONS: JobsOptions = {
  ...DEFAULT_PLATFORM_JOB_OPTIONS,
};

/** Stable BullMQ job-scheduler id for {@link PlatformJobName.ScheduledTick}. */
export const SCHEDULED_TICK_SCHEDULER_ID = 'platform-scheduled-tick' as const;

/** Scheduled tick: cheap heartbeat-style work; avoid heavy retries. */
export const SCHEDULED_TICK_JOB_OPTIONS: JobsOptions = {
  attempts: 1,
  removeOnComplete: 50,
  removeOnFail: 20,
};

/** Stable BullMQ job-scheduler id for {@link PlatformJobName.CmsPackagesReconcile}. */
export const CMS_PACKAGES_RECONCILE_SCHEDULER_ID =
  'cms-packages-reconcile' as const;

/** CMS catalogue mirror: bounded retries; failures should surface in worker logs. */
export const CMS_PACKAGES_RECONCILE_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 20,
  removeOnFail: 10,
};

/** Stable BullMQ job-scheduler id for {@link PlatformJobName.NbsMiddleRateRefresh}. */
export const NBS_MIDDLE_RATE_REFRESH_SCHEDULER_ID =
  'nbs-middle-rate-refresh' as const;

/** NBS rate fetch + Redis set: external dependency; bounded retries. */
export const NBS_MIDDLE_RATE_REFRESH_JOB_OPTIONS: JobsOptions = {
  attempts: 4,
  backoff: { type: 'exponential', delay: 30_000 },
  removeOnComplete: 14,
  removeOnFail: 10,
};
