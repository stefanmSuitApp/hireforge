/**
 * BullMQ conventions: queue name, job names, Zod payloads,
 * default {@link DEFAULT_PLATFORM_JOB_OPTIONS}, Redis connection helper, structured failure logs.
 * New jobs: add to {@link PlatformJobName}, schema in `job-payloads.ts`, worker branch, optional job-specific `JobsOptions`.
 * Outbox: {@link PlatformJobName.OutboxDispatch}, {@link outboxDispatchBullmqJobId}, {@link OUTBOX_DISPATCH_JOB_OPTIONS}, {@link OUTBOX_EVENT_TYPES}.
 * Scheduled tick: {@link PlatformJobName.ScheduledTick}, {@link SCHEDULED_TICK_SCHEDULER_ID}, {@link SCHEDULED_TICK_JOB_OPTIONS}.
 * CMS packages: {@link PlatformJobName.CmsPackagesReconcile}, {@link CMS_PACKAGES_RECONCILE_SCHEDULER_ID}, {@link CMS_PACKAGES_RECONCILE_JOB_OPTIONS}.
 * NBS rates: {@link PlatformJobName.NbsMiddleRateRefresh}, {@link NBS_MIDDLE_RATE_REFRESH_SCHEDULER_ID}, {@link NBS_MIDDLE_RATE_REFRESH_JOB_OPTIONS}.
 */
export * from './queue-names';
export * from './job-names';
export * from './job-options';
export * from './job-payloads';
export * from './job-logging';
export * from './redis-connection';
export * from './outbox-event-types';
export * from './outbox-bullmq-id';
