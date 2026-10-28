// Starts the real API (AppModule + configureApp, as main.ts does) against this
// test file's database and Redis, and signs users in through the real login
// endpoints. Test-only: never imported by the app.
import 'reflect-metadata';
import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { NBS_EUR_RSD_REDIS_KEY } from 'server-billing';
import request from 'supertest';
import {
  type Role,
  type SeededUser,
  TEST_PASSWORD,
  insertAdmin,
  insertCandidate,
  insertCompany,
  insertEmployer,
  insertModerator,
  insertSubscription,
} from 'testing/db';
import { AppModule } from '../app/app.module';
import { configureApp } from '../app/configure-app';
import { getPlatformQueue } from '../bullmq-queue';
import { getDb } from '../database';
import { getRedis } from '../redis';

export type Headers = Record<string, string>;

/**
 * Boots the API. `env` is applied to process.env first (the app reads its
 * config lazily from there, as in production).
 */
export async function startApp(
  env: Record<string, string | undefined> = {},
): Promise<INestApplication> {
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  return app;
}

/** Closes the app and the connection singletons it opened. */
export async function stopApp(
  app: INestApplication | undefined,
): Promise<void> {
  await app?.close();
  await getPlatformQueue()?.close();
  await getRedis()
    ?.quit()
    .catch(() => undefined);
  await getDb()
    ?.pool.end()
    .catch(() => undefined);
}

const LOGIN_PATH: Record<Role, string> = {
  candidate: '/api/auth/candidate/login',
  employer: '/api/auth/employer/login',
  moderator: '/api/auth/staff/login',
  admin: '/api/auth/staff/login',
};

export interface Session {
  headers: Headers;
  accessToken: string;
  refreshToken: string;
}

/** Logs in through the role's real login route; returns the bearer header. */
export async function signIn(
  server: Server,
  user: Pick<SeededUser, 'email' | 'role'>,
  password = TEST_PASSWORD,
): Promise<Session> {
  const res = await request(server)
    .post(LOGIN_PATH[user.role])
    .send({ email: user.email, password });
  if (res.status !== 201 && res.status !== 200) {
    throw new Error(
      `login as ${user.role} ${user.email} failed: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  const { accessToken, refreshToken } = res.body as {
    accessToken: string;
    refreshToken: string;
  };
  return {
    headers: { authorization: `Bearer ${accessToken}` },
    accessToken,
    refreshToken,
  };
}

export type Actor = SeededUser & {
  headers: Headers;
  companyId?: string;
  candidateId?: string;
};

/**
 * One signed-in user per role, each with what the role needs to do anything
 * (an employer has a company with an active ŠEF subscription).
 */
export async function signInAs(server: Server, role: Role): Promise<Actor> {
  switch (role) {
    case 'candidate': {
      const user = await insertCandidate();
      return { ...user, ...(await signIn(server, user)) };
    }
    case 'employer': {
      const company = await insertCompany();
      await insertSubscription(company.id);
      const user = await insertEmployer(company.id);
      return { ...user, ...(await signIn(server, user)) };
    }
    case 'moderator': {
      const user = await insertModerator();
      return { ...user, ...(await signIn(server, user)) };
    }
    case 'admin': {
      const user = await insertAdmin();
      return { ...user, ...(await signIn(server, user)) };
    }
  }
}

/**
 * Fills the NBS EUR→RSD cache the API reads before issuing RS invoices, so no
 * test reaches the real NBS site.
 */
export async function seedNbsRate(rate = '117.1234'): Promise<void> {
  const redis = new Redis(process.env['REDIS_URL'] ?? '');
  try {
    await redis.set(
      NBS_EUR_RSD_REDIS_KEY,
      JSON.stringify({
        rate,
        source_url: 'https://nbs.test/middle-rate',
        fetched_at: '2026-01-15T09:00:00.000Z',
        base_currency: 'EUR',
        target_currency: 'RSD',
      }),
    );
  } finally {
    await redis.quit();
  }
}

export const http = (app: INestApplication) =>
  request(app.getHttpServer() as Server);
