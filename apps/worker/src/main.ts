import './load-root-env';

import type { Job } from 'bullmq';
import { Queue, Worker } from 'bullmq';
import { createClient } from '@sanity/client';
import { cmsPackageCodes } from 'contracts';
import IORedis from 'ioredis';
import {
  attachBullmqRedisErrorLogging,
  bullmqJobCorrelationIdFromData,
  bullmqPrefixFromEnv,
  CMS_PACKAGES_RECONCILE_JOB_OPTIONS,
  CMS_PACKAGES_RECONCILE_SCHEDULER_ID,
  cmsPackagesReconcileJobPayloadSchema,
  createBullmqRedisConnection,
  DEFAULT_PLATFORM_JOB_OPTIONS,
  integrationPingJobPayloadSchema,
  logBullmqJobFailed,
  NBS_MIDDLE_RATE_REFRESH_JOB_OPTIONS,
  NBS_MIDDLE_RATE_REFRESH_SCHEDULER_ID,
  nbsMiddleRateRefreshJobPayloadSchema,
  outboxDispatchJobPayloadSchema,
  PLATFORM_QUEUE_NAME,
  PlatformJobName,
  SCHEDULED_TICK_JOB_OPTIONS,
  SCHEDULED_TICK_SCHEDULER_ID,
  scheduledTickJobPayloadSchema,
} from 'shared';
import {
  mapSanityPackageDefinitionDoc,
  upsertPackageMirrorAndAudit,
} from 'server-cms-sync';
import {
  expireSubscriptionsPastEndDate,
  refreshNbsMiddleRateCache,
} from 'server-billing';
import {
  expirePublishedJobsPastExpiresAt,
  notifyPublishedJobsExpiringSoon,
} from 'server-jobs';

import { runWithCorrelationId } from './correlation-context';
import { recordOutboxDlqIfTerminalFailure } from './outbox-dlq';
import {
  getWorkerDatabase,
  pollOutboxToPlatformQueue,
  processOutboxDispatchJob,
  startOutboxPoller,
} from './outbox';
import { workerLog } from './worker-log';

function resolveJobCorrelationId(job: Job): string | undefined {
  if (job.name === PlatformJobName.OutboxDispatch) {
    const parsed = outboxDispatchJobPayloadSchema.safeParse(job.data);
    return parsed.success ? parsed.data.correlationId : undefined;
  }
  if (job.name === PlatformJobName.IntegrationPing) {
    const parsed = integrationPingJobPayloadSchema.safeParse(job.data);
    return parsed.success ? parsed.data.correlationId : undefined;
  }
  if (job.name === PlatformJobName.CmsPackagesReconcile) {
    const parsed = cmsPackagesReconcileJobPayloadSchema.safeParse(job.data);
    return parsed.success ? parsed.data.correlationId : undefined;
  }
  if (job.name === PlatformJobName.NbsMiddleRateRefresh) {
    const parsed = nbsMiddleRateRefreshJobPayloadSchema.safeParse(job.data);
    return parsed.success ? parsed.data.correlationId : undefined;
  }
  return undefined;
}

const redisUrl =
  process.env.REDIS_URL ?? 'redis://:hireforge_dev_redis@127.0.0.1:6382';

/** General-purpose Redis (not BullMQ-pooled): NBS rate JSON cache. */
const nbsRateCacheRedis = new IORedis(redisUrl, {
  maxRetriesPerRequest: 3,
});

const producerConnection = createBullmqRedisConnection(redisUrl);
attachBullmqRedisErrorLogging(producerConnection, {
  service: 'worker',
  role: 'queue',
});

const platformQueue = new Queue(PLATFORM_QUEUE_NAME, {
  connection: producerConnection,
  prefix: bullmqPrefixFromEnv(),
  defaultJobOptions: DEFAULT_PLATFORM_JOB_OPTIONS,
});

const scheduleTickRaw = process.env['WORKER_SCHEDULE_TICK_MS']?.trim();
const scheduleTickParsed =
  scheduleTickRaw !== undefined && scheduleTickRaw !== ''
    ? parseInt(scheduleTickRaw, 10)
    : NaN;
const scheduleTickMs = Number.isFinite(scheduleTickParsed)
  ? Math.max(0, scheduleTickParsed)
  : 900_000;

if (scheduleTickMs > 0) {
  void platformQueue
    .upsertJobScheduler(
      SCHEDULED_TICK_SCHEDULER_ID,
      { every: scheduleTickMs },
      {
        name: PlatformJobName.ScheduledTick,
        data: {},
        opts: { ...SCHEDULED_TICK_JOB_OPTIONS },
      },
    )
    .then(() => {
      workerLog('info', 'scheduled_tick_scheduler_ready', {
        service: 'worker',
        everyMs: String(scheduleTickMs),
        schedulerId: SCHEDULED_TICK_SCHEDULER_ID,
      });
    })
    .catch((e) => {
      workerLog('error', 'scheduled_tick_scheduler_failed', {
        service: 'worker',
        err: e instanceof Error ? e.message : String(e),
      });
    });
} else {
  workerLog('info', 'scheduled_tick_scheduler_disabled', {
    service: 'worker',
    reason: 'WORKER_SCHEDULE_TICK_MS is 0 or invalid',
  });
}

const cmsReconcileRaw = process.env['WORKER_CMS_PACKAGES_RECONCILE_MS']?.trim();
const cmsReconcileParsed =
  cmsReconcileRaw !== undefined && cmsReconcileRaw !== ''
    ? parseInt(cmsReconcileRaw, 10)
    : NaN;
const cmsReconcileMs = Number.isFinite(cmsReconcileParsed)
  ? Math.max(0, cmsReconcileParsed)
  : 86_400_000;

if (cmsReconcileMs > 0) {
  void platformQueue
    .upsertJobScheduler(
      CMS_PACKAGES_RECONCILE_SCHEDULER_ID,
      { every: cmsReconcileMs },
      {
        name: PlatformJobName.CmsPackagesReconcile,
        data: {},
        opts: { ...CMS_PACKAGES_RECONCILE_JOB_OPTIONS },
      },
    )
    .then(() => {
      workerLog('info', 'cms_packages_reconcile_scheduler_ready', {
        service: 'worker',
        everyMs: String(cmsReconcileMs),
        schedulerId: CMS_PACKAGES_RECONCILE_SCHEDULER_ID,
      });
    })
    .catch((e) => {
      workerLog('error', 'cms_packages_reconcile_scheduler_failed', {
        service: 'worker',
        err: e instanceof Error ? e.message : String(e),
      });
    });
} else {
  workerLog('info', 'cms_packages_reconcile_scheduler_disabled', {
    service: 'worker',
    reason: 'WORKER_CMS_PACKAGES_RECONCILE_MS is 0 or invalid',
  });
}

const nbsRefreshRaw = process.env['WORKER_NBS_MIDDLE_RATE_MS']?.trim();
const nbsRefreshParsed =
  nbsRefreshRaw !== undefined && nbsRefreshRaw !== ''
    ? parseInt(nbsRefreshRaw, 10)
    : NaN;
const nbsRefreshMs = Number.isFinite(nbsRefreshParsed)
  ? Math.max(0, nbsRefreshParsed)
  : 86_400_000;

if (nbsRefreshMs > 0) {
  void platformQueue
    .upsertJobScheduler(
      NBS_MIDDLE_RATE_REFRESH_SCHEDULER_ID,
      { every: nbsRefreshMs },
      {
        name: PlatformJobName.NbsMiddleRateRefresh,
        data: {},
        opts: { ...NBS_MIDDLE_RATE_REFRESH_JOB_OPTIONS },
      },
    )
    .then(() => {
      workerLog('info', 'nbs_middle_rate_refresh_scheduler_ready', {
        service: 'worker',
        everyMs: String(nbsRefreshMs),
        schedulerId: NBS_MIDDLE_RATE_REFRESH_SCHEDULER_ID,
      });
    })
    .catch((e) => {
      workerLog('error', 'nbs_middle_rate_refresh_scheduler_failed', {
        service: 'worker',
        err: e instanceof Error ? e.message : String(e),
      });
    });
} else {
  workerLog('info', 'nbs_middle_rate_refresh_scheduler_disabled', {
    service: 'worker',
    reason: 'WORKER_NBS_MIDDLE_RATE_MS is 0 or invalid',
  });
}

const outboxPollMs = Math.max(
  500,
  parseInt(process.env['OUTBOX_POLL_INTERVAL_MS'] ?? '3000', 10) || 3000,
);
const outboxBatch = Math.min(
  200,
  Math.max(1, parseInt(process.env['OUTBOX_POLL_BATCH'] ?? '50', 10) || 50),
);

const workerDb = getWorkerDatabase();
if (workerDb) {
  void pollOutboxToPlatformQueue(platformQueue, workerDb.db, {
    batchSize: outboxBatch,
  }).catch((e) => {
    workerLog('error', 'outbox_poll_failed', {
      service: 'worker',
      err: e instanceof Error ? e.message : String(e),
    });
  });
  startOutboxPoller({
    queue: platformQueue,
    getDb: getWorkerDatabase,
    intervalMs: outboxPollMs,
    batchSize: outboxBatch,
  });
} else {
  workerLog('info', 'outbox_poller_disabled', {
    service: 'worker',
    reason: 'DATABASE_URL not set',
  });
}

const workerConnection = createBullmqRedisConnection(redisUrl);
attachBullmqRedisErrorLogging(workerConnection, {
  service: 'worker',
  role: 'worker',
});

const worker = new Worker(
  PLATFORM_QUEUE_NAME,
  async (job) =>
    runWithCorrelationId(resolveJobCorrelationId(job), async () => {
      if (job.name === PlatformJobName.IntegrationPing) {
        const parsed = integrationPingJobPayloadSchema.safeParse(job.data);
        if (!parsed.success) {
          workerLog('warn', 'bullmq_job_payload_invalid', {
            service: 'worker',
            queue: PLATFORM_QUEUE_NAME,
            jobId: job.id ?? '',
            jobName: job.name,
          });
          throw new Error('invalid_job_payload');
        }
        workerLog('info', 'integration_ping_job', {
          service: 'worker',
          jobId: job.id ?? '',
          name: job.name,
        });
        return { ok: true as const };
      }

      if (job.name === PlatformJobName.OutboxDispatch) {
        const parsed = outboxDispatchJobPayloadSchema.safeParse(job.data);
        if (!parsed.success) {
          workerLog('warn', 'bullmq_job_payload_invalid', {
            service: 'worker',
            queue: PLATFORM_QUEUE_NAME,
            jobId: job.id ?? '',
            jobName: job.name,
          });
          throw new Error('invalid_job_payload');
        }
        const database = getWorkerDatabase();
        if (!database) {
          throw new Error('database_not_configured');
        }
        await processOutboxDispatchJob(database.db, parsed.data.outboxEventId);
        return { ok: true as const };
      }

      if (job.name === PlatformJobName.ScheduledTick) {
        const parsed = scheduledTickJobPayloadSchema.safeParse(job.data ?? {});
        if (!parsed.success) {
          workerLog('warn', 'bullmq_job_payload_invalid', {
            service: 'worker',
            queue: PLATFORM_QUEUE_NAME,
            jobId: job.id ?? '',
            jobName: job.name,
          });
          throw new Error('invalid_job_payload');
        }
        workerLog('info', 'worker_scheduled_tick', {
          service: 'worker',
          jobId: job.id ?? '',
          queue: PLATFORM_QUEUE_NAME,
        });
        const database = getWorkerDatabase();
        if (database) {
          const expired = await expireSubscriptionsPastEndDate(database.db);
          if (expired > 0) {
            workerLog('info', 'subscriptions_expired', {
              service: 'worker',
              count: String(expired),
            });
          }

          const jobsExpired = await expirePublishedJobsPastExpiresAt(
            database.db,
          );
          if (jobsExpired > 0) {
            workerLog('info', 'jobs_expired_sweep', {
              service: 'worker',
              count: String(jobsExpired),
            });
          }

          const expiringSoon = await notifyPublishedJobsExpiringSoon(
            database.db,
          );
          if (expiringSoon > 0) {
            workerLog('info', 'jobs_expiring_soon_emitted', {
              service: 'worker',
              count: String(expiringSoon),
            });
          }
        }
        return { ok: true as const };
      }

      if (job.name === PlatformJobName.CmsPackagesReconcile) {
        const parsed = cmsPackagesReconcileJobPayloadSchema.safeParse(
          job.data ?? {},
        );
        if (!parsed.success) {
          workerLog('warn', 'bullmq_job_payload_invalid', {
            service: 'worker',
            queue: PLATFORM_QUEUE_NAME,
            jobId: job.id ?? '',
            jobName: job.name,
          });
          throw new Error('invalid_job_payload');
        }
        const database = getWorkerDatabase();
        if (!database) {
          throw new Error('database_not_configured');
        }
        const projectId =
          process.env.SANITY_PROJECT_ID?.trim() ||
          process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
        const dataset =
          process.env.SANITY_DATASET?.trim() ||
          process.env.NEXT_PUBLIC_SANITY_DATASET?.trim();
        const token = process.env.SANITY_API_READ_TOKEN?.trim();
        if (!projectId || !dataset || !token) {
          throw new Error('sanity_not_configured');
        }
        const client = createClient({
          projectId,
          dataset,
          apiVersion: '2024-01-01',
          useCdn: false,
          token,
        });
        const docs = await client.fetch<unknown[]>(
          `*[_type == "packageDefinition" && code in $codes]`,
          { codes: [...cmsPackageCodes] },
        );
        if (!Array.isArray(docs) || docs.length === 0) {
          workerLog('warn', 'cms_packages_reconcile_no_docs', {
            service: 'worker',
            jobId: job.id ?? '',
          });
        }
        let failures = 0;
        for (const doc of docs) {
          try {
            const payload = mapSanityPackageDefinitionDoc(doc);
            await upsertPackageMirrorAndAudit(database.db, payload, {
              source: 'cms_reconcile_job',
            });
          } catch (e) {
            failures += 1;
            workerLog('error', 'cms_packages_reconcile_doc_failed', {
              service: 'worker',
              jobId: job.id ?? '',
              err: e instanceof Error ? e.message : String(e),
            });
          }
        }
        if (failures > 0) {
          throw new Error(
            `cms_packages_reconcile: ${String(failures)} document(s) failed`,
          );
        }
        return { ok: true as const };
      }

      if (job.name === PlatformJobName.NbsMiddleRateRefresh) {
        const parsed = nbsMiddleRateRefreshJobPayloadSchema.safeParse(
          job.data ?? {},
        );
        if (!parsed.success) {
          workerLog('warn', 'bullmq_job_payload_invalid', {
            service: 'worker',
            queue: PLATFORM_QUEUE_NAME,
            jobId: job.id ?? '',
            jobName: job.name,
          });
          throw new Error('invalid_job_payload');
        }
        const snapshot = await refreshNbsMiddleRateCache(nbsRateCacheRedis);
        workerLog('info', 'nbs_middle_rate_refreshed', {
          service: 'worker',
          jobId: job.id ?? '',
          rate: snapshot.rate,
          fetchedAt: snapshot.fetched_at,
        });
        return { ok: true as const };
      }

      workerLog('warn', 'bullmq_unhandled_job_name', {
        service: 'worker',
        jobId: job.id ?? '',
        name: job.name,
      });
    }),
  { connection: workerConnection, prefix: bullmqPrefixFromEnv() },
);

worker.on('failed', (job, err) => {
  const correlationId = bullmqJobCorrelationIdFromData(job);
  logBullmqJobFailed(job, err, {
    service: 'worker',
    queueName: PLATFORM_QUEUE_NAME,
    ...(correlationId ? { correlationId } : {}),
  });
  void recordOutboxDlqIfTerminalFailure(job, err);
});

workerLog('info', 'worker_started', {
  service: 'worker',
  queue: PLATFORM_QUEUE_NAME,
});

// Keep the process alive until shutdown.
setInterval(() => {
  // no-op
}, 60_000);
