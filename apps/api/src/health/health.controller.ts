import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';

import { pingDb } from '../database';
import { pingRedis } from '../redis';

@Controller('health')
export class HealthController {
  /** Process is up (orchestrator liveness). */
  @Get('live')
  live() {
    return { status: 'ok' as const };
  }

  /** Dependencies required when configured (readiness). */
  @Get('ready')
  async ready() {
    const pgConfigured = Boolean(process.env.DATABASE_URL);
    const redisConfigured = Boolean(process.env.REDIS_URL);

    const pgStatus = !pgConfigured
      ? ('skipped' as const)
      : (await pingDb())
        ? ('up' as const)
        : ('down' as const);
    const redisStatus = !redisConfigured
      ? ('skipped' as const)
      : (await pingRedis())
        ? ('up' as const)
        : ('down' as const);

    const checks = {
      postgres: pgStatus,
      redis: redisStatus,
    };

    const ready = pgStatus !== 'down' && redisStatus !== 'down';

    if (!ready) {
      throw new HttpException(
        {
          message: 'not_ready',
          checks,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return { status: 'ready' as const, checks };
  }
}
