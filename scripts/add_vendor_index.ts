
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import ws from 'ws';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

neonConfig.webSocketConstructor = ws;

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing');
        process.exit(1);
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    try {
        console.log('Adding GIN index to vendors column...');
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_vulnerabilities_vendors ON vulnerabilities USING GIN (vendors);
        `);
        console.log('GIN index added successfully.');
    } catch (error) {
        console.error('Failed to add index:', error);
    } finally {
        await pool.end();
    }
}

main();
