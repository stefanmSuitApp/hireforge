/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import './load-root-env';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { getDb, pingDb } from './database';
import { AllExceptionsFilter } from './observability/http-exception.filter';
import { LoggingInterceptor } from './observability/logging.interceptor';
import { getRedis, pingRedis } from './redis';

async function bootstrap() {
  const db = getDb();
  if (!db) {
    Logger.warn('DATABASE_URL not set — database connection disabled');
  } else {
    try {
      await pingDb();
      Logger.log('Postgres connection established');
    } catch (error) {
      Logger.error(
        `Postgres connection failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  const redis = getRedis();
  if (!redis) {
    Logger.warn('REDIS_URL not set — redis connection disabled');
  } else {
    try {
      await pingRedis();
      Logger.log('Redis connection established');
    } catch (error) {
      Logger.error(
        `Redis connection failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = Number(process.env.API_PORT || process.env.PORT || 4000);
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
