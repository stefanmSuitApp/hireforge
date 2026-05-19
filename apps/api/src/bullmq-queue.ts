import { Queue } from 'bullmq';

import {
  attachBullmqRedisErrorLogging,
  bullmqPrefixFromEnv,
  createBullmqRedisConnection,
  DEFAULT_PLATFORM_JOB_OPTIONS,
  PLATFORM_QUEUE_NAME,
} from 'shared';

let platformQueue: Queue | null = null;

/**
 * BullMQ queue producer (API). Worker runs in `apps/worker` with a matching `Worker`.
 * Conventions: {@link PLATFORM_QUEUE_NAME}, default job options, shared Redis connection settings.
 */
export function getPlatformQueue(): Queue | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }
  if (!platformQueue) {
    const connection = createBullmqRedisConnection(url);
    attachBullmqRedisErrorLogging(connection, {
      service: 'api',
      role: 'queue',
    });
    platformQueue = new Queue(PLATFORM_QUEUE_NAME, {
      connection,
      prefix: bullmqPrefixFromEnv(),
      defaultJobOptions: DEFAULT_PLATFORM_JOB_OPTIONS,
    });
  }
  return platformQueue;
}
