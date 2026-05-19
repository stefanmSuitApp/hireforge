import type { Job } from 'bullmq';

import { writeLog } from '../structured-log';

export type BullmqFailureLogContext = {
  service: 'api' | 'worker';
  queueName: string;
  correlationId?: string;
};

/**
 * Structured log when a job finishes in the `failed` state (after retries exhausted).
 */
export function logBullmqJobFailed(
  job: Job | undefined,
  err: unknown,
  ctx: BullmqFailureLogContext,
): void {
  writeLog('error', 'bullmq_job_failed', {
    service: ctx.service,
    queue: ctx.queueName,
    jobId: job?.id ?? '',
    jobName: job?.name ?? '',
    attemptsMade: job?.attemptsMade ?? 0,
    failedReason: job?.failedReason ?? '',
    err: err instanceof Error ? err.message : String(err),
    ...(ctx.correlationId ? { correlationId: ctx.correlationId } : {}),
  });
}

/**
 * Producer-side: Redis/BullMQ rejected `queue.add` (misconfig, connectivity, etc.).
 */
export function logBullmqEnqueueFailed(
  jobName: string,
  err: unknown,
  ctx: { service: 'api'; correlationId?: string } = { service: 'api' },
): void {
  writeLog('error', 'bullmq_enqueue_failed', {
    service: ctx.service,
    jobName,
    err: err instanceof Error ? err.message : String(err),
    ...(ctx.correlationId ? { correlationId: ctx.correlationId } : {}),
  });
}

/** Best-effort: read `correlationId` from known BullMQ job payload shapes (for `failed` handlers). */
export function bullmqJobCorrelationIdFromData(job: Job | undefined): string {
  const d = job?.data as Record<string, unknown> | undefined;
  const v = d?.['correlationId'];
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}
