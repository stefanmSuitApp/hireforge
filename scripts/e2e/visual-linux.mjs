#!/usr/bin/env node
/**
 * `pnpm e2e:visual`: the screenshot suite with pages rendered by Linux
 * Chromium in Microsoft's Playwright image (same version as the repo), so
 * local runs compare against the Linux baselines CI uses. The stack and the
 * tests run here (scripts/e2e/run.mjs --visual); only the browser runs in the
 * container. Needs Docker with host networking (OrbStack, Docker Desktop
 * 4.34+). Extra args go to Playwright (`--update-snapshots` writes baselines).
 * On CI (already Linux) it runs the suite directly. Ported from autofind.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { connect } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
config({ path: join(root, '.env'), quiet: true });
const args = process.argv.slice(2);
const env = { ...process.env, E2E_WEB: 'start' };

const run = (extraEnv = {}) =>
  spawnSync('node', ['scripts/e2e/run.mjs', '--visual', ...args], {
    cwd: root,
    stdio: 'inherit',
    env: { ...env, ...extraEnv },
  }).status ?? 1;

if (process.env.CI || process.platform === 'linux') {
  process.exit(run());
}

const webPort = Number(process.env.E2E_WEB_PORT ?? 3100);
// Per checkout, like the other e2e ports: parallel runs never share a server.
const browserPort = Number(process.env.E2E_BROWSER_PORT ?? webPort + 4000);
const { version } = createRequire(import.meta.url)(
  '@playwright/test/package.json',
);
const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const container = `hireforge-e2e-browser-${browserPort}`;

const listening = () =>
  new Promise((done) => {
    const socket = connect(browserPort, '127.0.0.1');
    socket.once('connect', () => done(socket.end() && true));
    socket.once('error', () => done(false));
  });

if (await listening()) {
  console.error(
    `e2e:visual — port ${browserPort} is busy; set E2E_BROWSER_PORT.`,
  );
  process.exit(1);
}

const started = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '--detach',
    '--name',
    container,
    '--network',
    'host',
    '-v',
    `${root}/node_modules:/work/node_modules:ro`,
    image,
    'node',
    '/work/node_modules/@playwright/test/cli.js',
    'run-server',
    '--port',
    String(browserPort),
    '--host',
    '127.0.0.1',
  ],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);
if (started.status !== 0) process.exit(started.status ?? 1);

let status = 1;
try {
  for (let i = 0; !(await listening()); i++) {
    if (i > 120)
      throw new Error('the browser server did not start (host networking on?)');
    await new Promise((r) => setTimeout(r, 250));
  }
  status = run({ E2E_BROWSER_WS: `ws://127.0.0.1:${browserPort}/` });
} catch (e) {
  console.error(`e2e:visual — ${e.message}`);
} finally {
  spawnSync('docker', ['stop', container], { stdio: 'ignore' });
}
process.exit(status);
