
import { config } from 'dotenv';
config(); // Load env vars first

import { db } from "../server/db";
import { sql } from "drizzle-orm";
// Use the path relative to script execution or absolute path logic if needed, 
// but assuming ts-node handles it. 
// Standard import:
import { fetchCveFromR2 } from "../server/services/r2";
import { getDb } from "../server/db";

async function main() {
    const db = getDb();
    const cveId = 'CVE-2023-2038';

    console.log(`Checking DB status for ${cveId}...`);
    const res = await db.execute(sql`SELECT id, has_r2_backing FROM vulnerabilities WHERE id = ${cveId}`);

    if (res.rows.length === 0) {
        console.log("CVE not found in DB");
    } else {
        console.log("DB Record:", res.rows[0]);
    }

    console.log(`Attempting R2 fetch for ${cveId}...`);
    try {
        const data = await fetchCveFromR2(cveId);
        if (data) {
            console.log("R2 Fetch Success!");
            console.log("Keys:", Object.keys(data));
            console.log("Description preview:", data.description?.substring(0, 50));
        } else {
            console.log("R2 Fetch returned null/undefined");
        }
    } catch (error) {
        console.error("R2 Fetch Error:", error);
    }

    process.exit(0);
}

main().catch(console.error);
