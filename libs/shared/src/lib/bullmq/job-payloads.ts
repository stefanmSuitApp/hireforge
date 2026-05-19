import { z } from 'zod';

/** Payload for {@link PlatformJobName.IntegrationPing}. */
export const integrationPingJobPayloadSchema = z.object({
  /** ISO-8601 timestamp from the producer (enqueue time). */
  at: z.string().min(16).max(64),
  /** API request correlation when enqueued from Nest (Phase 7.4). */
  correlationId: z.string().min(1).max(256).optional(),
});

export type IntegrationPingJobPayload = z.infer<
  typeof integrationPingJobPayloadSchema
>;

/** Payload for {@link PlatformJobName.OutboxDispatch}. */
export const outboxDispatchJobPayloadSchema = z.object({
  outboxEventId: z.number().int().positive(),
  /** Copied from `outbox_events.correlation_id` when the worker enqueues (Phase 7.4). */
  correlationId: z.string().min(1).max(256).optional(),
});

export type OutboxDispatchJobPayload = z.infer<
  typeof outboxDispatchJobPayloadSchema
>;

/** Payload for {@link PlatformJobName.ScheduledTick} (scheduler template). */
export const scheduledTickJobPayloadSchema = z.object({});

export type ScheduledTickJobPayload = z.infer<
  typeof scheduledTickJobPayloadSchema
>;

/** Payload for {@link PlatformJobName.CmsPackagesReconcile}. */
export const cmsPackagesReconcileJobPayloadSchema = z.object({
  correlationId: z.string().min(1).max(256).optional(),
});

export type CmsPackagesReconcileJobPayload = z.infer<
  typeof cmsPackagesReconcileJobPayloadSchema
>;

/** Payload for {@link PlatformJobName.NbsMiddleRateRefresh}. */
export const nbsMiddleRateRefreshJobPayloadSchema = z.object({
  correlationId: z.string().min(1).max(256).optional(),
});

export type NbsMiddleRateRefreshJobPayload = z.infer<
  typeof nbsMiddleRateRefreshJobPayloadSchema
>;
