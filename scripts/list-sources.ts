import 'dotenv/config';
import { getDb } from '../server/db.js';
import { articles } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

async function main() {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");

    console.log("Fetching distinct sources...");
    const result = await db.execute(sql`SELECT DISTINCT source FROM articles ORDER BY source`);

    console.log("Sources found:");
    result.rows.forEach((row: any) => console.log(`- ${row.source}`));

    process.exit(0);
}

main();
