import { createDb } from 'database';

let cached: ReturnType<typeof createDb> | null = null;

/** Returns a singleton Drizzle pool when `DATABASE_URL` is set; otherwise `null`. */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return null;
  }
  if (!cached) {
    cached = createDb(url);
  }
  return cached;
}

export async function pingDb(): Promise<boolean> {
  const database = getDb();
  if (!database) {
    return false;
  }

  await database.pool.query('select 1');
  return true;
}
