import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { writeLog } from 'shared';

import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import { getCorrelationId } from './correlation-storage';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const { method, originalUrl } = req;
    const started = Date.now();

    const line = (statusCode: number) =>
      writeLog('info', 'http_request', {
        service: 'api',
        method,
        path: originalUrl ?? req.url,
        statusCode,
        durationMs: Date.now() - started,
        correlationId: getCorrelationId() ?? 'unknown',
      });

    return next.handle().pipe(
      tap({
        error: (err: unknown) => {
          const status =
            err instanceof HttpException
              ? err.getStatus()
              : HttpStatus.INTERNAL_SERVER_ERROR;
          line(status);
        },
        complete: () => {
          const res = http.getResponse<Response>();
          line(res.statusCode);
        },
      }),
    );
  }
}
