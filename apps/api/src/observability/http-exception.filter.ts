import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import type { ApiErrorBody } from 'shared';
import { writeLog } from 'shared';

import type { Request, Response } from 'express';

import { getCorrelationId } from './correlation-storage';

function formatErrorChain(exception: unknown): string {
  if (!(exception instanceof Error)) {
    return String(exception);
  }
  const parts: string[] = [exception.message];
  let c: unknown = (exception as { cause?: unknown }).cause;
  let depth = 0;
  while (c instanceof Error && depth < 6) {
    parts.push(`caused by: ${c.message}`);
    c = (c as { cause?: unknown }).cause;
    depth += 1;
  }
  return parts.join(' | ');
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      getCorrelationId() ??
      (typeof request.headers['x-request-id'] === 'string'
        ? request.headers['x-request-id']
        : undefined) ??
      'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resBody = exception.getResponse();
      let applicationCode: string | undefined;

      if (typeof resBody === 'object' && resBody !== null) {
        const r = resBody as Record<string, unknown>;
        if (typeof r['code'] === 'string' && r['code'].length > 0) {
          applicationCode = r['code'];
        }
        if ('checks' in r) {
          details = r['checks'];
        }
        if ('details' in r) {
          details = r['details'];
        }
        if ('message' in r) {
          const m = r['message'];
          message = Array.isArray(m)
            ? m.join(', ')
            : typeof m === 'string'
              ? m
              : JSON.stringify(m);
        } else {
          message = exception.message;
        }
      } else if (typeof resBody === 'string') {
        message = resBody;
      } else {
        message = exception.message;
      }

      if (applicationCode) {
        code = applicationCode;
      } else if (status === HttpStatus.NOT_FOUND) {
        code = 'NOT_FOUND';
      } else if (status === HttpStatus.SERVICE_UNAVAILABLE) {
        code = 'SERVICE_UNAVAILABLE';
      } else if (status === HttpStatus.CONFLICT) {
        code = 'CONFLICT';
      } else if (status === HttpStatus.UNAUTHORIZED) {
        code = 'UNAUTHORIZED';
      } else if (status === HttpStatus.FORBIDDEN) {
        code = 'FORBIDDEN';
      } else {
        code = 'HTTP_EXCEPTION';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Only true crashes (non-HttpException) are "unhandled". HttpException is an
    // intentional response — avoid error-level noise for 503 migration hints, etc.
    if (status >= 500 && !(exception instanceof HttpException)) {
      writeLog('error', 'unhandled_http_error', {
        service: 'api',
        correlationId,
        statusCode: status,
        err: formatErrorChain(exception),
      });
    }

    const body: ApiErrorBody = {
      error: {
        code,
        message,
        requestId: correlationId,
        ...(details !== undefined ? { details } : {}),
      },
    };

    response.status(status).json(body);
  }
}
