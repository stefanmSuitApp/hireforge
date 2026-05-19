import { Injectable } from '@nestjs/common';
import { createClient } from '@sanity/client';

import {
  INTEGRATION_PING_JOB_OPTIONS,
  integrationPingJobPayloadSchema,
  logBullmqEnqueueFailed,
  PlatformJobName,
} from 'shared';

import { getPlatformQueue } from '../bullmq-queue';
import { pingDb } from '../database';
import { getCorrelationId } from '../observability/correlation-storage';
import { pingRedis } from '../redis';

export type IntegrationStatus = {
  message: string;
  postgres: 'up' | 'down' | 'skipped';
  redis: 'up' | 'down' | 'skipped';
  bullmq: 'up' | 'down' | 'skipped';
  /** Present when a ping job was enqueued successfully. */
  bullmqJobId?: string;
  sanity: 'up' | 'down' | 'skipped';
};

@Injectable()
export class IntegrationService {
  async getStatus(): Promise<IntegrationStatus> {
    const pgConfigured = Boolean(process.env.DATABASE_URL);
    const redisConfigured = Boolean(process.env.REDIS_URL);

    const postgres = !pgConfigured
      ? ('skipped' as const)
      : (await pingDb())
        ? ('up' as const)
        : ('down' as const);

    const redis = !redisConfigured
      ? ('skipped' as const)
      : (await pingRedis())
        ? ('up' as const)
        : ('down' as const);

    let bullmq: IntegrationStatus['bullmq'] = 'skipped';
    let bullmqJobId: string | undefined;
    if (redisConfigured) {
      const queue = getPlatformQueue();
      if (!queue) {
        bullmq = 'down';
      } else {
        try {
          const correlationId = getCorrelationId();
          const payload = integrationPingJobPayloadSchema.parse({
            at: new Date().toISOString(),
            ...(correlationId ? { correlationId } : {}),
          });
          const job = await queue.add(
            PlatformJobName.IntegrationPing,
            payload,
            INTEGRATION_PING_JOB_OPTIONS,
          );
          bullmqJobId = job.id ?? undefined;
          bullmq = 'up';
        } catch (e) {
          logBullmqEnqueueFailed(PlatformJobName.IntegrationPing, e, {
            service: 'api',
            correlationId: getCorrelationId(),
          });
          bullmq = 'down';
        }
      }
    }

    const projectId =
      process.env.SANITY_PROJECT_ID ??
      process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ??
      '';
    const dataset =
      process.env.SANITY_DATASET ??
      process.env.NEXT_PUBLIC_SANITY_DATASET ??
      'production';

    let sanity: IntegrationStatus['sanity'] = 'skipped';
    if (projectId) {
      try {
        const client = createClient({
          projectId,
          dataset,
          apiVersion: '2024-01-01',
          useCdn: true,
          token: process.env.SANITY_API_READ_TOKEN || undefined,
        });
        await client.fetch<boolean>('true');
        sanity = 'up';
      } catch {
        sanity = 'down';
      }
    }

    return {
      message: 'hireforge-integration',
      postgres,
      redis,
      bullmq,
      ...(bullmqJobId ? { bullmqJobId } : {}),
      sanity,
    };
  }
}
