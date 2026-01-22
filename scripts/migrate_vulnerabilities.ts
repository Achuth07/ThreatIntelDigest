
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const runMigration = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined');
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    console.log('Running migration to enrich vulnerabilities table...');

    try {
        // Add columns if they don't exist
        await db.execute(sql`
      ALTER TABLE vulnerabilities 
      ADD COLUMN IF NOT EXISTS cvss_vector text,
      ADD COLUMN IF NOT EXISTS exploitability_score numeric(3,1),
      ADD COLUMN IF NOT EXISTS impact_score numeric(3,1),
      ADD COLUMN IF NOT EXISTS affected_products jsonb DEFAULT '[]'::jsonb;
    `);

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
};

runMigration();
