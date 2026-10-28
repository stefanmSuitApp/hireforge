import { writeFileSync } from 'node:fs';
import { inject, it } from 'vitest';
import { testDb } from '../../db';

it('reports which Postgres and database this run got', async () => {
  const { postgres } = inject('integration');
  await testDb().pool.query('select 1');
  writeFileSync(
    process.env['PROBE_OUT'] ?? '/dev/null',
    JSON.stringify({ port: postgres.port, database: testDb().name }),
  );
});
