
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

    try {
        const result = await db.execute(sql`
            SELECT count(*) as count 
            FROM articles 
            WHERE targeted_industries IS NOT NULL 
            AND jsonb_array_length(targeted_industries) > 0
        `);
        console.log('Articles with targeted_industries:', result.rows[0].count);

        const sample = await db.execute(sql`
            SELECT id, title, targeted_industries 
            FROM articles 
            WHERE targeted_industries IS NOT NULL 
            AND jsonb_array_length(targeted_industries) > 0
            LIMIT 1
        `);
        if (sample.rows.length > 0) {
            console.log('Sample row:', JSON.stringify(sample.rows[0], null, 2));
        }
    } catch (e) {
        console.error('Error querying db:', e);
    }
    process.exit(0);
}
main();
