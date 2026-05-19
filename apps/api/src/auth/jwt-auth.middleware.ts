import type { NextFunction, Request, Response } from 'express';

import { verifyAccessToken } from './jwt';

/**
 * When `Authorization: Bearer <access>` is valid, sets `request.hireforgeUser`.
 * Runs after `devUserMiddleware` so dev headers keep precedence.
 */
export async function jwtAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.hireforgeUser) {
    next();
    return;
  }
  const raw = req.headers.authorization;
  if (typeof raw !== 'string' || !raw.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = raw.slice('Bearer '.length).trim();
  if (!token) {
    next();
    return;
  }
  try {
    const payload = await verifyAccessToken(token);
    req.hireforgeUser = { id: payload.sub, role: payload.role };
  } catch {
    // Invalid/expired token — leave unauthenticated; guards return 401.
  }
  next();
}
