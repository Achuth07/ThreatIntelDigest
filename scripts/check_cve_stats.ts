
import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking CVE statistics...");

    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }

    const db = getDb();

    try {
        const result = await db.execute(sql`
            SELECT 
                COUNT(*) as total_count,
                MIN(published_date) as oldest_date,
                MAX(published_date) as newest_date
            FROM vulnerabilities
        `);

        console.table(result.rows);

        // Check count per year to see distribution
        const distResult = await db.execute(sql`
            SELECT 
                EXTRACT(YEAR FROM published_date) as year,
                COUNT(*) as count
            FROM vulnerabilities
            GROUP BY year
            ORDER BY year ASC
        `);

        console.table(distResult.rows);

    } catch (error) {
        console.error("Error checking stats:", error);
    }
    process.exit(0);
}

main();
