import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../shared/schema.js';

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

export { schema };