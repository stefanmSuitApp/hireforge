import { createHash } from 'node:crypto';

import type { Request } from 'express';

import { codedTooManyRequests } from '../http/coded-http';
import { consumeRateLimit } from '../http/rate-limit';

const MINUTE = 60;

/** Per-window budgets. Login is limited per IP and per target email. */
const LIMITS = {
  loginPerIp: { limit: 20, windowSec: 15 * MINUTE },
  loginPerEmail: { limit: 10, windowSec: 15 * MINUTE },
  // Generous: mobile carriers put many users behind one shared IP (CGNAT).
  registerPerIp: { limit: 30, windowSec: 60 * MINUTE },
  refreshPerIp: { limit: 300, windowSec: 15 * MINUTE },
  emailLinkPerIp: { limit: 30, windowSec: 15 * MINUTE },
  resetRequestPerIp: { limit: 10, windowSec: 60 * MINUTE },
  resetRequestPerEmail: { limit: 5, windowSec: 60 * MINUTE },
  resendVerificationPerUser: { limit: 5, windowSec: 60 * MINUTE },
} as const;

/**
 * Client IP as forwarded by the Next BFF (`X-Forwarded-For`, first entry).
 * Nest is only reachable from the web container, so without the header every
 * request would share the web container's address; return null instead and
 * skip IP-based limits rather than throttling all users as one.
 */
export function forwardedClientIp(req: Request): string | null {
  const raw = req.headers['x-forwarded-for'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const first = value?.split(',')[0]?.trim();
  return first ? first.slice(0, 64) : null;
}

function emailKey(email: string): string {
  return createHash('sha256')
    .update(email.trim().toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

async function enforce(
  key: string,
  budget: { limit: number; windowSec: number },
): Promise<void> {
  const result = await consumeRateLimit(key, budget.limit, budget.windowSec);
  if (!result.allowed) {
    throw codedTooManyRequests(
      'AUTH_RATE_LIMITED',
      `Too many attempts. Try again in ${Math.ceil(result.retryAfterSec / MINUTE)} min.`,
    );
  }
}

export async function assertLoginRateLimit(
  req: Request,
  scope: 'candidate' | 'employer' | 'staff',
  email: string,
): Promise<void> {
  const ip = forwardedClientIp(req);
  if (ip) {
    await enforce(`auth:login:ip:${ip}`, LIMITS.loginPerIp);
  }
  await enforce(
    `auth:login:${scope}:email:${emailKey(email)}`,
    LIMITS.loginPerEmail,
  );
}

export async function assertRegisterRateLimit(req: Request): Promise<void> {
  const ip = forwardedClientIp(req);
  if (ip) {
    await enforce(`auth:register:ip:${ip}`, LIMITS.registerPerIp);
  }
}

export async function assertRefreshRateLimit(req: Request): Promise<void> {
  const ip = forwardedClientIp(req);
  if (ip) {
    await enforce(`auth:refresh:ip:${ip}`, LIMITS.refreshPerIp);
  }
}

/** Token-bearing links (verify email, reset confirm): limits token guessing. */
export async function assertEmailLinkRateLimit(req: Request): Promise<void> {
  const ip = forwardedClientIp(req);
  if (ip) {
    await enforce(`auth:link:ip:${ip}`, LIMITS.emailLinkPerIp);
  }
}

export async function assertPasswordResetRequestRateLimit(
  req: Request,
  email: string,
): Promise<void> {
  const ip = forwardedClientIp(req);
  if (ip) {
    await enforce(`auth:reset:ip:${ip}`, LIMITS.resetRequestPerIp);
  }
  await enforce(
    `auth:reset:email:${emailKey(email)}`,
    LIMITS.resetRequestPerEmail,
  );
}

export async function assertResendVerificationRateLimit(
  userId: string,
): Promise<void> {
  await enforce(
    `auth:resend-verify:user:${userId}`,
    LIMITS.resendVerificationPerUser,
  );
}
