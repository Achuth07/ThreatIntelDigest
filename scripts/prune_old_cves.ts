
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
        console.log('Pruning CVEs older than 10 years...');
        const tenYearsAgo = new Date();
        tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

        const result = await db.execute(sql`
            DELETE FROM vulnerabilities 
            WHERE published_date < ${tenYearsAgo}
            AND id NOT IN (SELECT cve_id FROM known_exploited_vulnerabilities)
        `);

        console.log(`Pruned ${result.rowCount} old CVEs.`);
    } catch (error) {
        console.error('Failed to prune CVEs:', error);
    } finally {
        await pool.end();
    }
}

main();
