import type { INestApplication } from '@nestjs/common';

import { AllExceptionsFilter } from '../observability/http-exception.filter';
import { LoggingInterceptor } from '../observability/logging.interceptor';

export const GLOBAL_PREFIX = 'api';

/**
 * Interceptors, error filter and route prefix of the running API. Shared by
 * `main.ts` and the integration tests, so tests boot exactly what ships.
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix(GLOBAL_PREFIX);
}
