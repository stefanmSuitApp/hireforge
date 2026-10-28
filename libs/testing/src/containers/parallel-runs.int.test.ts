import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, expect, it } from 'vitest';

const libRoot = fileURLToPath(new URL('../../', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'hf-probe-'));
afterAll(() => rmSync(out, { recursive: true, force: true }));

function runProbe(name: string): Promise<{ code: number; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        join(libRoot, '../../node_modules/vitest/vitest.mjs'),
        'run',
        '--config',
        'src/__fixtures__/probe/vitest.config.mts',
      ],
      {
        cwd: libRoot,
        env: { ...process.env, PROBE_OUT: join(out, `${name}.json`) },
      },
    );
    let output = '';
    child.stdout.on('data', (c) => (output += c));
    child.stderr.on('data', (c) => (output += c));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}

it('two integration runs at the same time get their own containers', async () => {
  const [first, second] = await Promise.all([runProbe('a'), runProbe('b')]);
  expect(first.code, first.output).toBe(0);
  expect(second.code, second.output).toBe(0);
  const a = JSON.parse(readFileSync(join(out, 'a.json'), 'utf8'));
  const b = JSON.parse(readFileSync(join(out, 'b.json'), 'utf8'));
  expect(a.port).not.toBe(b.port);
  // And the parent run's own container is a third one.
  expect([a.port, b.port]).not.toContain(
    Number(new URL(process.env['DATABASE_URL'] ?? '').port),
  );
}, 180_000);
