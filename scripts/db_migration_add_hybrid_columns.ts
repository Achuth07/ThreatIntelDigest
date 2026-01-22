
import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Applying manual schema migration for Hybrid Storage...");

    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }

    const db = getDb();

    try {
        console.log("Adding 'has_r2_backing' column...");
        await db.execute(sql`
            ALTER TABLE vulnerabilities 
            ADD COLUMN IF NOT EXISTS has_r2_backing BOOLEAN DEFAULT FALSE;
        `);

        console.log("Adding 'search_vector' column...");
        await db.execute(sql`
            ALTER TABLE vulnerabilities 
            ADD COLUMN IF NOT EXISTS search_vector TEXT;
        `);

        console.log("Migration columns added successfully.");

    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
    process.exit(0);
}

main();
