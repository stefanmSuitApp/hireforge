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
  config({ path: envPath, quiet: true });
}
