import IORedis from 'ioredis';

/**
 * Pre-fills the NBS EUR→RSD middle-rate cache (libs/server/billing
 * `NBS_EUR_RSD_REDIS_KEY`) so billing tests never call nbs.rs.
 */
export async function seedNbsRateCache(): Promise<void> {
  const redis = new IORedis(process.env['E2E_REDIS_URL'] ?? '');
  try {
    await redis.setex(
      'hireforge:billing:nbs_eur_rsd_middle:v1',
      3600,
      JSON.stringify({
        rate: '117.1500',
        source_url: 'https://www.nbs.rs/test-fixture',
        fetched_at: new Date().toISOString(),
        base_currency: 'EUR',
        target_currency: 'RSD',
      }),
    );
  } finally {
    redis.disconnect();
  }
}

/** Clears auth rate-limit counters so tests sharing 127.0.0.1 don't throttle each other. */
export async function resetRateLimits(): Promise<void> {
  const redis = new IORedis(process.env['E2E_REDIS_URL'] ?? '');
  try {
    const keys = await redis.keys('hf:rl:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } finally {
    redis.disconnect();
  }
}
