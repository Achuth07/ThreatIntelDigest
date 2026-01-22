
import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking index sizes for vulnerabilities table...");

    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }

    const db = getDb();

    try {
        const result = await db.execute(sql`
            SELECT
                i.relname AS "index_name",
                pg_size_pretty(pg_relation_size(i.oid)) AS "size"
            FROM pg_class t, pg_class i, pg_index ix
            WHERE t.oid = ix.indrelid
            AND i.oid = ix.indexrelid
            AND t.relname = 'vulnerabilities'
            ORDER BY pg_relation_size(i.oid) DESC;
        `);

        console.table(result.rows);

    } catch (error) {
        console.error("Error checking index sizes:", error);
    }
    process.exit(0);
}

main();
