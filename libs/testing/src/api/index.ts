import type { INestApplication } from '@nestjs/common';

export type Role = 'admin' | 'moderator' | 'employer' | 'candidate';
export const ROLES: readonly Role[] = [
  'candidate',
  'employer',
  'moderator',
  'admin',
];

/** Who may call a route. Every route the API serves is in exactly one bucket. */
export type Access =
  | { kind: 'public'; why: string }
  | { kind: 'session' }
  | { kind: 'roles'; roles: readonly Role[] }
  | { kind: 'token'; header: string };

interface ExpressLayer {
  route?: { path: string; methods: Record<string, boolean> };
}

/** Every route the booted Nest app serves, as `METHOD /path` (Express router). */
export function listRoutes(app: INestApplication): string[] {
  const express = app.getHttpAdapter().getInstance() as {
    router: { stack: ExpressLayer[] };
  };
  return express.router.stack.flatMap((layer) =>
    // Middleware bound with `forRoutes('*path')` shows up as a route per verb
    // (`/api$`, `/api/*path`); controller routes never use wildcards.
    layer.route && !/[*$]/.test(layer.route.path)
      ? Object.keys(layer.route.methods)
          .filter((m) => m !== '_all')
          .map((m) => `${m.toUpperCase()} ${layer.route?.path}`)
      : [],
  );
}

/** Fills `:params` with values that pass the route's pipes but match no row. */
export function fillPath(
  path: string,
  values: Record<string, string> = {},
): string {
  return path.replace(/:(\w+)/g, (_, name: string) => {
    if (values[name]) return values[name];
    return /slug/i.test(name)
      ? 'no-such-slug'
      : '00000000-0000-4000-8000-00000000dead';
  });
}

export function splitRoute(route: string): {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
} {
  const [method, path] = route.split(' ') as [string, string];
  return {
    method: method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete',
    path,
  };
}

/**
 * What a caller may see for a route they are not allowed on: 401 without a
 * session, 403 for the wrong role. `allowed` means "got past the guards".
 */
export function expectedOutcome(
  access: Access,
  caller: Role | 'anonymous',
): 'allowed' | 401 | 403 {
  switch (access.kind) {
    case 'public':
      return 'allowed';
    case 'token':
      return 401;
    case 'session':
      return caller === 'anonymous' ? 401 : 'allowed';
    case 'roles':
      if (caller === 'anonymous') return 401;
      return access.roles.includes(caller) ? 'allowed' : 403;
  }
}
