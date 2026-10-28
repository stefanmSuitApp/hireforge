import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { http, signInAs, startApp, stopApp } from './test-app';

let app: INestApplication;
beforeAll(async () => {
  app = await startApp();
});
afterAll(() => stopApp(app));

describe('API test harness', () => {
  it('boots the real app on this file database and Redis: ready says both are up', async () => {
    const res = await http(app).get('/api/health/ready').expect(200);
    expect(res.body).toEqual({
      status: 'ready',
      checks: { postgres: 'up', redis: 'up' },
    });
  });

  it('signs each role in through its real login route', async () => {
    for (const role of [
      'candidate',
      'employer',
      'moderator',
      'admin',
    ] as const) {
      const actor = await signInAs(app.getHttpServer(), role);
      const res = await http(app)
        .get('/api/internal/whoami')
        .set(actor.headers)
        .expect(200);
      expect(res.body.user).toEqual({ id: actor.id, role });
    }
  });

  it('answers unknown routes with the coded 404 of the real error filter', async () => {
    const res = await http(app).get('/api/no-such-route').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
