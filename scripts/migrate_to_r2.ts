
import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";
import { uploadCveToR2, checkCveInR2 } from "../server/services/r2";

async function main() {
    console.log("Starting Migration to R2...");

    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }

    const batcheSize = 500;
    const db = getDb();

    try {
        // 1. Get total count of unmigrated records
        const countRes = await db.execute(sql`
            SELECT COUNT(*) as count 
            FROM vulnerabilities 
            WHERE has_r2_backing IS FALSE OR has_r2_backing IS NULL
        `);
        const totalToMigrate = parseInt(countRes.rows[0].count as string);
        console.log(`Found ${totalToMigrate} records to migrate.`);

        let processed = 0;
        let errors = 0;

        while (processed < totalToMigrate) {
            // Fetch batch
            const batch = await db.execute(sql`
                SELECT *
                FROM vulnerabilities 
                WHERE has_r2_backing IS FALSE OR has_r2_backing IS NULL
                LIMIT ${batcheSize}
            `);

            if (batch.rows.length === 0) break;

            const promises = batch.rows.map(async (row: any) => {
                const cveId = row.id;

                // Construct the JSON object to store in R2
                // We store EVERYTHING in R2, even fields we keep in DB, for redundancy/ease
                const fullData = {
                    id: row.id,
                    description: row.description,
                    publishedDate: row.published_date,
                    lastModifiedDate: row.last_modified_date,
                    vulnStatus: row.vuln_status,
                    cvssV3Score: row.cvss_v3_score,
                    cvssV3Severity: row.cvss_v3_severity,
                    cvssV2Score: row.cvss_v2_score,
                    cvssV2Severity: row.cvss_v2_severity,
                    cvssVector: row.cvss_vector,
                    weaknesses: row.weaknesses,
                    vendors: row.vendors,
                    affectedProducts: row.affected_products,
                    referenceUrls: row.reference_urls,
                    exploitabilityScore: row.exploitability_score,
                    impactScore: row.impact_score
                };

                // Create search vector (simple concatenation for now)
                const searchRef = (row.reference_urls as any[])?.map(r => r.url).join(' ') || '';
                const searchProd = (row.affected_products as any[])?.map(p => `${p.vendor} ${p.product}`).join(' ') || '';
                const searchText = `${row.id} ${row.description} ${searchProd}`.substring(0, 10000); // Limit size just in case

                // Upload to R2
                const success = await uploadCveToR2(cveId, fullData);

                if (success) {
                    // Update DB tag
                    await db.execute(sql`
                        UPDATE vulnerabilities 
                        SET 
                            has_r2_backing = TRUE,
                            search_vector = ${searchText}
                        WHERE id = ${cveId}
                    `);
                    return true;
                } else {
                    console.error(`Failed to upload ${cveId}`);
                    return false;
                }
            });

            const results = await Promise.all(promises);
            const batchSuccess = results.filter(r => r).length;
            const batchFail = results.filter(r => !r).length;

            processed += batch.rows.length;
            errors += batchFail;

            console.log(`Processed ${processed}/${totalToMigrate} (Success: ${batchSuccess}, Fail: ${batchFail})`);

            // Brief pause to not overwhelm R2/DB
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`Migration Complete. Total: ${processed}, Errors: ${errors}`);

    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
    process.exit(0);
}

main();
