
import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking database storage usage...");

    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }

    const db = getDb();

    try {
        const result = await db.execute(sql`
            SELECT
                relname AS "relation",
                pg_size_pretty(pg_total_relation_size(C.oid)) AS "total_size",
                pg_size_pretty(pg_relation_size(C.oid)) AS "table_size",
                pg_size_pretty(pg_total_relation_size(C.oid) - pg_relation_size(C.oid)) AS "index_size"
            FROM pg_class C
            LEFT JOIN pg_namespace N ON (N.oid = C.relnamespace)
            WHERE nspname NOT IN ('pg_catalog', 'information_schema')
            AND C.relkind <> 'i'
            AND nspname !~ '^pg_toast'
            ORDER BY pg_total_relation_size(C.oid) DESC
            LIMIT 20;
        `);

        console.table(result.rows);

    } catch (error) {
        console.error("Error checking storage:", error);
    }
    process.exit(0);
}

main();
