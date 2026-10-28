import { Logger } from '@nestjs/common';

import { getRedis } from '../redis';

const logger = new Logger('RateLimit');

/**
 * Fixed-window counter. INCR and the first EXPIRE run atomically, so a crash
 * between them cannot leave a key without TTL (which would block forever).
 */
const HIT_SCRIPT = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return {n, redis.call('TTL', KEYS[1])}
`;

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  retryAfterSec: number;
};

/**
 * Counts one hit for `key` and reports whether it is within `limit` per
 * `windowSec`. Fails open (allowed) when Redis is missing or erroring so an
 * outage degrades protection rather than locking everyone out.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    return { allowed: true, count: 0, retryAfterSec: 0 };
  }
  try {
    const [count, ttl] = (await redis.eval(
      HIT_SCRIPT,
      1,
      `hf:rl:${key}`,
      String(windowSec),
    )) as [number, number];
    return {
      allowed: count <= limit,
      count,
      retryAfterSec: ttl > 0 ? ttl : windowSec,
    };
  } catch (error) {
    logger.warn(
      `rate limit check failed for ${key} (fail-open): ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
    return { allowed: true, count: 0, retryAfterSec: 0 };
  }
}
