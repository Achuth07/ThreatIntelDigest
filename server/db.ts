import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from '../shared/schema.js';
import ws from 'ws';

// Required for Neon serverless driver to work in Node.js environment
neonConfig.webSocketConstructor = ws;

let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const pool = new Pool({ connectionString });
    db = drizzle(pool, { schema });
  }

  return db;
}

// Tests run against an in-process Postgres (tests/helpers/db.ts) and set it here, so getDb()
// never opens a connection to Neon during a test run.
export function setDbForTests(testDb: unknown) {
  db = testDb as ReturnType<typeof drizzle> | null;
}

export { schema };