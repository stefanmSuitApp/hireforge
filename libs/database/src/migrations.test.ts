import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Migrations are hand-written (drizzle/meta only has the 0000 snapshot) and
 * applied by `drizzle-kit migrate`, which runs every journal entry whose
 * `when` is newer than the last applied one. A merged migration that changes
 * afterwards never re-runs on prod, so prod and a fresh database drift apart.
 */
const root = resolve(__dirname, '../../..');
const dir = join(root, 'drizzle');

type Journal = { entries: Array<{ idx: number; tag: string; when: number }> };

function git(args: string[]) {
  return spawnSync('git', args, { cwd: root, encoding: 'utf8' });
}

/**
 * Where this branch left main, so migrations merged to main later don't show
 * up as "deleted here". Shallow CI clones have no history; there the checked
 * out commit already contains main (PR merge ref, or main itself).
 */
function mainBase(): string | null {
  if (git(['rev-parse', '--verify', '--quiet', 'origin/main']).status !== 0) {
    return null;
  }
  const mergeBase = git(['merge-base', 'origin/main', 'HEAD']);
  return mergeBase.status === 0 ? mergeBase.stdout.trim() : 'origin/main';
}

const journal = JSON.parse(
  readFileSync(join(dir, 'meta/_journal.json'), 'utf8'),
) as Journal;

describe('drizzle migrations', () => {
  it('journal `when` strictly increases, so drizzle-kit never skips one', () => {
    const whens = journal.entries.map((e) => e.when);
    expect(whens).toEqual([...whens].sort((a, b) => a - b));
    expect(new Set(whens).size).toBe(whens.length);
  });

  it('every journal entry has its SQL file and every SQL file is in the journal', () => {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    expect(files).toEqual(journal.entries.map((e) => `${e.tag}.sql`).sort());
  });

  it('merged migrations are never edited (compared with origin/main)', () => {
    const base = mainBase();
    expect(base, 'origin/main is needed (CI fetches it)').not.toBeNull();

    const diff = git(['diff', '--name-status', base ?? '', '--', 'drizzle']);
    expect(diff.status, diff.stderr).toBe(0);
    const changed = diff.stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('\t'))
      // New files are fine; the journal is checked entry by entry below.
      .filter(
        ([status, file]) =>
          status !== 'A' && !file?.endsWith('meta/_journal.json'),
      );
    expect(changed).toEqual([]);

    const onMain = git(['show', `${base}:drizzle/meta/_journal.json`]);
    expect(onMain.status, onMain.stderr).toBe(0);
    const mainEntries = (JSON.parse(onMain.stdout) as Journal).entries;
    expect(journal.entries.slice(0, mainEntries.length)).toEqual(mainEntries);
  });
});
