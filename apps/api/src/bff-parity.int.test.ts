// T5.3: every Next BFF route (apps/web/src/app/api/**/route.ts) that calls the
// API targets a route the API really serves (the T2 registry), so a renamed or
// removed Nest route can't leave a BFF route answering 404 in production.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROUTES } from './__harness__/routes';

// apps/api is the working directory of the Nx target.
const WEB_API = join(process.cwd(), '../web/src/app/api');

/** BFF routes that don't talk to Nest on purpose. */
const NO_NEST: Record<string, string> = {
  'hello/route.ts': 'Next scaffold placeholder',
  'revalidate/sanity/route.ts': 'Sanity webhook → Next revalidation',
  'indexnow-key/[key]/route.ts': 'IndexNow ownership proof (answers the key)',
  // Refresh tokens are stateless JWTs until Phase C: logout only clears cookies.
  'candidate/auth/logout/route.ts': 'clears session cookies',
  'employer/auth/logout/route.ts': 'clears session cookies',
  'moderator/auth/logout/route.ts': 'clears session cookies',
};

/** Top-level API segments: a string literal starting with one is a Nest path. */
const NEST_PREFIXES =
  'auth|candidate|employer|moderator|admin|public|internal|integration|cms|health';

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === 'route.ts' ? [full] : [];
  });
}

/** The Nest paths a BFF file calls, `${x}` → `:param`, query dropped. */
function nestPathsIn(source: string): string[] {
  // An optional `${origin}` in front, then the path.
  const literal = new RegExp(
    `(['\`])(?:\\$\\{[^}]+\\})?(/?(?:api/)?(?:${NEST_PREFIXES})(?:/[^'\`\\s]*)?)\\1`,
    'g',
  );
  const calls = [...source.matchAll(literal)].map((m) => m[2] ?? '');
  return calls.map(
    (p) =>
      `/${p.replace(/^\/?(api\/)?/, 'api/')}`
        .split('?')[0]
        ?.replace(/\$\{[^}]+\}/g, ':param') ?? '',
  );
}

const servedPaths = Object.keys(ROUTES).map((r) => r.slice(r.indexOf(' ') + 1));

function served(path: string): boolean {
  const want = path.split('/');
  return servedPaths.some((have) => {
    const got = have.split('/');
    return (
      got.length === want.length &&
      got.every(
        (seg, i) =>
          seg === want[i] || seg.startsWith(':') || want[i] === ':param',
      )
    );
  });
}

const files = routeFiles(WEB_API).map((f) => relative(WEB_API, f));

describe('BFF → Nest parity', () => {
  it('finds the BFF routes', () => {
    expect(files.length).toBeGreaterThanOrEqual(70);
  });

  for (const file of files) {
    if (file in NO_NEST) continue;
    it(`${file} calls only Nest routes that exist`, () => {
      const paths = nestPathsIn(readFileSync(join(WEB_API, file), 'utf8'));
      expect(paths.length, 'calls at least one Nest route').toBeGreaterThan(0);
      expect(paths.filter((p) => !served(p))).toEqual([]);
    });
  }

  it('the parser understands both call styles and template parameters', () => {
    expect(
      nestPathsIn(
        "nestApiUrl(origin ?? '', `moderator/jobs/${jobId}/publish`)",
      ),
    ).toEqual(['/api/moderator/jobs/:param/publish']);
    expect(nestPathsIn("proxyNestPost(req, 'auth/verify-email')")).toEqual([
      '/api/auth/verify-email',
    ]);
    expect(
      nestPathsIn(
        'const path = ok ? `public/jobs/${id}` : `public/jobs/by-slug/${encodeURIComponent(s)}`;',
      ),
    ).toEqual(['/api/public/jobs/:param', '/api/public/jobs/by-slug/:param']);
    expect(nestPathsIn('fetch(`${origin}/api/integration`)')).toEqual([
      '/api/integration',
    ]);
    expect(served('/api/moderator/jobs/:param/publish')).toBe(true);
    expect(served('/api/moderator/jobs/:param/publish-twice')).toBe(false);
  });
});
