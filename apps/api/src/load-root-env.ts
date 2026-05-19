import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config } from 'dotenv';

/** Walk up from this file until a `.env` is found (monorepo root), so it works regardless of `process.cwd()`. */
function findWorkspaceEnvPath(): string | undefined {
  let dir = __dirname;
  for (let i = 0; i < 16; i++) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return undefined;
}

const envPath = findWorkspaceEnvPath();
if (envPath) {
  // Nx already loads workspace `.env` into `process.env` before the task runs, so dotenv
  // often injects 0 keys (default: no override). Quiet avoids misleading "(0)" logs under `nx serve`.
  config({ path: envPath, quiet: true });
}
