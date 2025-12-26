
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing');
        process.exit(1);
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    console.log('Adding targeted_industries column to articles table...');

    try {
        await db.execute(sql`
            ALTER TABLE articles 
            ADD COLUMN IF NOT EXISTS targeted_industries JSONB DEFAULT '[]'::jsonb;
        `);
        console.log('Successfully added targeted_industries column.');
    } catch (e) {
        console.error('Error adding column:', e);
    }

    process.exit(0);
}

main().catch(console.error);
