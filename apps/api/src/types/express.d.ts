import type { UserRole } from 'contracts';

declare global {
  namespace Express {
    interface Request {
      /** Set by `devUserMiddleware` when `AUTH_DEV_HEADERS=1` and user id header is valid. */
      hireforgeUser?: { id: string; role: UserRole };
    }
  }
}

export {};
