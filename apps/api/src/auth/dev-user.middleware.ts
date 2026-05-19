import { eq } from 'drizzle-orm';
import { users } from 'database';

import type { NextFunction, Request, Response } from 'express';

import { getDb } from '../database';

/**
 * Loads `request.hireforgeUser` from DB when enabled.
 * Set `AUTH_DEV_HEADERS=1` and send header `X-Hireforge-Dev-User-Id: <uuid>` (see seed SQL).
 * Role is always taken from Postgres, not the header (spoof-proof).
 */
export async function devUserMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (process.env.AUTH_DEV_HEADERS !== '1') {
    next();
    return;
  }
  const raw = req.headers['x-hireforge-dev-user-id'];
  if (typeof raw !== 'string' || !raw.trim()) {
    next();
    return;
  }
  const userId = raw.trim();
  const database = getDb();
  if (!database) {
    next();
    return;
  }
  const rows = await database.db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const row = rows[0];
  if (row) {
    req.hireforgeUser = { id: row.id, role: row.role };
  }
  next();
}
