import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { setDbForTests } from '../../server/db.js';
import { SEED_SQL } from './seed.js';
import { r2 } from './r2.js';

// One in-memory Postgres per test file, built from tests/fixtures/schema.sql (production's
// structure, see scripts/dump-test-schema.ts) and the seed in seed.ts.

const SCHEMA_SQL = readFileSync(path.resolve(__dirname, '../fixtures/schema.sql'), 'utf8');

export async function createTestDb() {
  const pg = new PGlite();
  await pg.exec(SCHEMA_SQL);
  await pg.exec(SEED_SQL);
  // Fills pg_class.reltuples, which the unfiltered list count reads.
  await pg.exec('ANALYZE');
  const db = drizzle(pg);
  setDbForTests(db);
  return { pg, db };
}

// Registers the hooks for a test file: a fresh database before the file, empty rate-limit
// counters and fake R2 before each test, and cleanup after.
export function useTestDb() {
  const handle = {} as Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => { Object.assign(handle, await createTestDb()); });
  beforeEach(async () => {
    await handle.pg.exec('TRUNCATE api_rate_limits');
    r2.reset();
  });
  afterAll(async () => {
    setDbForTests(null);
    await handle.pg.close();
  });
  return handle;
}
