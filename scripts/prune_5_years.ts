
import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Starting 5-year Prune (Keeping 2021+)...");

    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }

    const db = getDb();

    try {
        // 1. Count before
        const before = await db.execute(sql`SELECT COUNT(*) as count FROM vulnerabilities`);
        const countBefore = parseInt(before.rows[0].count as string);
        console.log(`Records before: ${countBefore}`);

        // 2. Delete older than 2021-01-01
        // EXCLUDING Known Exploited Vulnerabilities (KEVs) - we always want those
        console.log("Deleting records older than 2021-01-01 (excluding KEVs)...");

        const deleteResult = await db.execute(sql`
            DELETE FROM vulnerabilities 
            WHERE published_date < '2021-01-01'
            AND id NOT IN (SELECT cve_id FROM known_exploited_vulnerabilities)
        `);

        console.log(`Deleted ${deleteResult.rowCount} records.`);

        // 3. Count after
        const after = await db.execute(sql`SELECT COUNT(*) as count FROM vulnerabilities`);
        const countAfter = parseInt(after.rows[0].count as string);
        console.log(`Records remaining: ${countAfter}`);

        // 4. Run VACUUM to reclaim space (Note: VACUUM FULL locks table, standard VACUUM is safer but slower to reclaim)
        console.log("Running VACUUM to reclaim storage space...");
        try {
            // Cannot run VACUUM inside a transaction block usually, depends on driver.
            // Drizzle execute might wrap in transaction? Let's try simple VACUUM first.
            await db.execute(sql`VACUUM vulnerabilities`);
            console.log("VACUUM completed.");
        } catch (e) {
            console.warn("VACUUM failed (might strictly require no-transaction context):", e);
        }

    } catch (error) {
        console.error("Pruning failed:", error);
        process.exit(1);
    }
    process.exit(0);
}

main();
