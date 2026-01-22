
import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";
import { fetchCveFromR2 } from "../server/services/r2";

async function main() {
    const db = getDb();
    try {
        const result = await db.execute(sql`
            SELECT id, has_r2_backing 
            FROM vulnerabilities 
            WHERE has_r2_backing = TRUE 
            LIMIT 1
        `);

        if (result.rows.length > 0) {
            const id = result.rows[0].id;
            console.log(`Found migrated CVE in DB: ${id}`);

            console.log("Attempting to fetch from R2...");
            const r2Data = await fetchCveFromR2(id);
            if (r2Data) {
                console.log("R2 Fetch Success! Data preview:");
                console.log(JSON.stringify(r2Data).substring(0, 200) + "...");
            } else {
                console.error("R2 Fetch Failed (returned null)");
            }

        } else {
            console.log("No migrated CVEs found yet.");
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
main();
