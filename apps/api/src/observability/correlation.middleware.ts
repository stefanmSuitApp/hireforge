import { randomUUID } from 'crypto';

import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from 'shared';

import type { NextFunction, Request, Response } from 'express';

import { correlationStorage } from './correlation-storage';

function headerString(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value) && value[0]?.trim()) {
    return value[0].trim();
  }
  return undefined;
}

export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const correlationId =
    headerString(req.headers[REQUEST_ID_HEADER]) ??
    headerString(req.headers[CORRELATION_ID_HEADER]) ??
    randomUUID();

  res.setHeader(REQUEST_ID_HEADER, correlationId);

  correlationStorage.run({ correlationId }, () => {
    next();
  });
}
