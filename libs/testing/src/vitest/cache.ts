import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

/**
 * Gives one vitest config its own Vite cache directory. Nx starts projects in
 * parallel, and a shared cache can race on startup (autofind saw ENOTEMPTY).
 */
export function testCacheDir(configUrl: string): string {
  const name = relative(repoRoot, fileURLToPath(configUrl))
    .replace(/\.[^.]+$/, '')
    .replace(/[\\/]+/g, '-');
  return resolve(repoRoot, `node_modules/.vite-cache-${name}`);
}
