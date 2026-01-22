
import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("FINALIZING HYBRID STORAGE MIGRATION...");

    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }

    const db = getDb();

    try {
        // 1. Verify all records have R2 backing
        console.log("Verifying migration status...");
        const countRes = await db.execute(sql`
            SELECT COUNT(*) as count 
            FROM vulnerabilities 
            WHERE has_r2_backing IS FALSE OR has_r2_backing IS NULL
        `);
        const pendingCount = parseInt(countRes.rows[0].count as string);

        if (pendingCount > 0) {
            console.error(`ERROR: Found ${pendingCount} records that have NOT been migrated to R2.`);
            console.error("Cannot drop columns until all records are migrated.");
            process.exit(1);
        }

        console.log("All records verified. Proceeding to DROP columns...");

        // 2. Drop heavy columns
        // Keeping 'vendors' (indexable)
        // Dropping 'description', 'affected_products', 'reference_urls'
        // 'search_vector' replaces full text search

        await db.execute(sql`
            ALTER TABLE vulnerabilities 
            DROP COLUMN IF EXISTS description,
            DROP COLUMN IF EXISTS affected_products,
            DROP COLUMN IF EXISTS reference_urls;
        `);

        console.log("Columns dropped successfully.");

        // 3. VACUUM FULL to reclaim space
        console.log("Running VACUUM FULL to reclaim dist space (this may take a while)...");
        try {
            await db.execute(sql`VACUUM FULL vulnerabilities`);
            console.log("VACUUM FULL verified.");
        } catch (e) {
            console.warn("VACUUM FULL failed (may require superuser or transaction isolation):", e);
        }

    } catch (error) {
        console.error("Finalization failed:", error);
        process.exit(1);
    }
    process.exit(0);
}

main();
