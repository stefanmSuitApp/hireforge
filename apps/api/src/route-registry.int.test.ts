// T2.1 + T2.2: every route the API serves is classified here, and every route
// is called by every kind of caller. A new route that isn't added fails the
// first test; a role route whose guard goes missing fails the matrix.
import 'reflect-metadata';
import { type INestApplication, RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  MODULE_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import {
  type Access,
  expectedOutcome,
  fillPath,
  listRoutes,
  ROLES,
  type Role,
  splitRoute,
} from 'testing/api';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ROUTES } from './__harness__/routes';
import {
  type Actor,
  http,
  signInAs,
  startApp,
  stopApp,
} from './__harness__/test-app';
import { AppModule } from './app/app.module';
import { GLOBAL_PREFIX } from './app/configure-app';
import { AuthenticatedGuard } from './auth/authenticated.guard';
import { ROLES_KEY } from './auth/auth.constants';
import { RolesGuard } from './auth/roles.guard';

type Ctor = {
  new (...args: never[]): unknown;
  prototype: Record<string, unknown>;
};
type Handler = (...args: never[]) => unknown;

function controllersOf(module: unknown, seen = new Set<unknown>()): Ctor[] {
  if (seen.has(module)) return [];
  seen.add(module);
  const own = (Reflect.getMetadata(
    MODULE_METADATA.CONTROLLERS,
    module as object,
  ) ?? []) as Ctor[];
  const imports = (Reflect.getMetadata(
    MODULE_METADATA.IMPORTS,
    module as object,
  ) ?? []) as unknown[];
  return [...own, ...imports.flatMap((m) => controllersOf(m, seen))];
}

/** Access as declared by the decorators: guards and @Roles on handler or class. */
function declaredAccess(): Record<
  string,
  'none' | 'session' | `roles:${string}`
> {
  const out: Record<string, 'none' | 'session' | `roles:${string}`> = {};
  for (const controller of controllersOf(AppModule)) {
    const base = String(Reflect.getMetadata(PATH_METADATA, controller) ?? '');
    for (const name of Object.getOwnPropertyNames(controller.prototype)) {
      const handler = controller.prototype[name] as Handler;
      if (name === 'constructor' || typeof handler !== 'function') continue;
      const path = Reflect.getMetadata(PATH_METADATA, handler) as
        | string
        | undefined;
      if (path === undefined) continue;
      const method =
        RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as number];
      const guards = [
        ...((Reflect.getMetadata(GUARDS_METADATA, controller) ??
          []) as unknown[]),
        ...((Reflect.getMetadata(GUARDS_METADATA, handler) ?? []) as unknown[]),
      ];
      const declaredRoles = (Reflect.getMetadata(ROLES_KEY, handler) ??
        Reflect.getMetadata(ROLES_KEY, controller)) as Role[] | undefined;
      const parts = [GLOBAL_PREFIX, base, path]
        .map((p) => p.replace(/^\/+|\/+$/g, ''))
        .filter(Boolean);
      const route = `${method} /${parts.join('/')}`;
      const authenticated = guards.includes(AuthenticatedGuard);
      const roleChecked = guards.includes(RolesGuard) && declaredRoles?.length;
      out[route] = !authenticated
        ? 'none'
        : roleChecked
          ? `roles:${[...(declaredRoles ?? [])].sort().join(',')}`
          : 'session';
    }
  }
  return out;
}

const describeAccess = (access: Access) =>
  access.kind === 'roles'
    ? `roles:${[...access.roles].sort().join(',')}`
    : access.kind === 'session'
      ? 'session'
      : 'none';

let app: INestApplication;
const actors: Partial<Record<Role, Actor>> = {};

beforeAll(async () => {
  app = await startApp({ CMS_SYNC_SECRET: 'cms-test-secret' });
  for (const role of ROLES) {
    actors[role] = await signInAs(app.getHttpServer(), role);
  }
});
afterAll(() => stopApp(app));

describe('route registry', () => {
  it('every route the API serves is classified exactly once, and nothing classified is gone', () => {
    const served = listRoutes(app).sort();
    expect(served).toEqual(Object.keys(ROUTES).sort());
  });

  it('the guards on each route match its classification (no role route without RolesGuard)', () => {
    const declared = declaredAccess();
    const fromRegistry = Object.fromEntries(
      Object.entries(ROUTES).map(([route, access]) => [
        route,
        describeAccess(access),
      ]),
    );
    expect(declared).toEqual(fromRegistry);
  });
});

const CALLERS = ['anonymous', ...ROLES] as const;

describe('role matrix: every route × every caller', () => {
  for (const [route, access] of Object.entries(ROUTES)) {
    for (const caller of CALLERS) {
      const expected = expectedOutcome(access, caller);
      const who =
        caller === 'anonymous'
          ? 'an anonymous caller'
          : `${caller === 'admin' ? 'an' : 'a'} ${caller}`;
      const name =
        expected === 'allowed'
          ? `${route} lets ${who} through`
          : `${route} answers ${expected} to ${who}`;
      it(name, async () => {
        const { method, path } = splitRoute(route);
        const headers =
          caller === 'anonymous' ? {} : (actors[caller]?.headers ?? {});
        const res = await http(app)
          [method](fillPath(path))
          .set(headers)
          .send({});
        // A malformed or missing record is a 4xx, never a crash.
        expect(res.status, JSON.stringify(res.body)).toBeLessThan(500);
        if (expected === 'allowed') {
          expect([401, 403], JSON.stringify(res.body)).not.toContain(
            res.status,
          );
        } else {
          expect(res.status, JSON.stringify(res.body)).toBe(expected);
        }
      });
    }
  }
});

describe('token routes', () => {
  it('the CMS sync webhook refuses a wrong secret and accepts the configured one', async () => {
    await http(app)
      .post('/api/cms/sync/package')
      .set('x-cms-sync-secret', 'wrong-secret-of-same-len')
      .send({})
      .expect(401);
    const res = await http(app)
      .post('/api/cms/sync/package')
      .set('x-cms-sync-secret', 'cms-test-secret')
      .send({});
    expect([400, 422]).toContain(res.status);
  });
});
