import IORedis from 'ioredis';

import { writeLog } from '../structured-log';

/**
 * BullMQ requires `maxRetriesPerRequest: null` on ioredis (see BullMQ docs).
 */
export function createBullmqRedisConnection(url: string): IORedis {
  return new IORedis(url, { maxRetriesPerRequest: null });
}

/** Redis key prefix for BullMQ; must match between API producer and worker. */
export function bullmqPrefixFromEnv(): string {
  const raw = process.env['BULLMQ_PREFIX']?.trim();
  return raw && raw.length > 0 ? raw : '{hireforge}';
}

export function attachBullmqRedisErrorLogging(
  connection: IORedis,
  context: { service: 'api' | 'worker'; role: 'queue' | 'worker' },
): void {
  connection.on('error', (err) => {
    writeLog('error', 'bullmq_redis_connection_error', {
      service: context.service,
      context: context.role,
      err: err instanceof Error ? err.message : String(err),
    });
  });
}
