import IORedis from 'ioredis';

let cached: IORedis | null = null;

/** Returns a singleton Redis client when `REDIS_URL` is set; otherwise `null`. */
export function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }

  if (!cached) {
    cached = new IORedis(url, {
      maxRetriesPerRequest: null,
    });
  }

  return cached;
}

export async function pingRedis(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    return false;
  }

  const result = await redis.ping();
  return result === 'PONG';
}
