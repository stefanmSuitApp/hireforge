import { randomBytes } from 'node:crypto';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { Client } from 'pg';
import type { TestProject } from 'vitest/node';
import { prepareTemplate } from '../db/template';
import { type IntegrationContext, pgUrl, TEMPLATE_DB } from './context';
import { POSTGRES_IMAGE, REDIS_IMAGE } from './images';

// Testcontainers may report `localhost`, which on a Mac can resolve to ::1 and
// reach a different server; the published ports are bound on 127.0.0.1.
const ipv4 = (host: string) => (host === 'localhost' ? '127.0.0.1' : host);
const secret = () => randomBytes(18).toString('hex');

/**
 * Where the run is, for the exit report below, so a run that exits non-zero
 * says which phase it was in. No such line on a failed run means the process
 * was killed from outside.
 */
let phase: 'starting containers' | 'running tests' | 'stopping containers' =
  'starting containers';
process.on('exit', (code) => {
  if (code !== 0) {
    process.stderr.write(
      `[integration] vitest exiting with code ${code} while ${phase}\n`,
    );
  }
});

/**
 * One Postgres and one Redis container per test run (fresh, random ports), so
 * two runs at the same time (two terminals, two clones, CI) never share data.
 * Ryuk removes them if the run dies.
 */
export default async function setup(project: TestProject) {
  const user = 'hireforge';
  const password = secret();
  const redisPassword = secret();

  const [pg, redis] = await Promise.all([
    new PostgreSqlContainer(POSTGRES_IMAGE)
      .withUsername(user)
      .withPassword(password)
      .withDatabase('postgres')
      // Throwaway data: skip fsync for speed; never do this outside tests.
      .withCommand([
        'postgres',
        '-c',
        'fsync=off',
        '-c',
        'full_page_writes=off',
        '-c',
        'max_connections=300',
      ])
      .start(),
    new RedisContainer(REDIS_IMAGE).withPassword(redisPassword).start(),
  ]);

  const ctx: IntegrationContext = {
    postgres: {
      host: ipv4(pg.getHost()),
      port: pg.getPort(),
      user,
      password,
      template: TEMPLATE_DB,
    },
    redis: {
      host: ipv4(redis.getHost()),
      port: redis.getPort(),
      password: redisPassword,
    },
  };

  const server = new Client({
    connectionString: pgUrl(ctx.postgres, 'postgres'),
  });
  await server.connect();
  try {
    await server.query(`create database ${TEMPLATE_DB}`);
  } finally {
    await server.end();
  }
  await prepareTemplate(pgUrl(ctx.postgres, TEMPLATE_DB));

  project.provide('integration', ctx);
  console.info(
    `[integration] postgres 127.0.0.1:${ctx.postgres.port} · redis 127.0.0.1:${ctx.redis.port} · container ${pg.getId().slice(0, 12)}`,
  );
  phase = 'running tests';

  return async () => {
    phase = 'stopping containers';
    const stopped = await Promise.allSettled([pg.stop(), redis.stop()]);
    // Not a test failure (Ryuk removes what is left), but never silent.
    for (const [i, result] of stopped.entries()) {
      if (result.status === 'rejected') {
        console.warn(
          `[integration] stopping ${i === 0 ? 'postgres' : 'redis'} failed:`,
          result.reason,
        );
      }
    }
  };
}
