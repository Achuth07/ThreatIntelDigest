
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log('Starting Backfill Script...');
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing');
        process.exit(1);
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    // Get KEVs
    console.log('Fetching KEVs (Recent First)...');
    const kevsResult = await db.execute(sql`SELECT cve_id FROM known_exploited_vulnerabilities ORDER BY date_added DESC`);
    const kevIds = kevsResult.rows.map((r: any) => r.cve_id as string);
    console.log(`Found ${kevIds.length} KEVs`);

    // Get existing NVDs
    console.log('Fetching existing NVD records...');
    const nvdResult = await db.execute(sql`SELECT id FROM vulnerabilities`);
    const nvdIds = new Set(nvdResult.rows.map((r: any) => r.id as string));
    console.log(`Found ${nvdIds.size} existing NVD records`);

    // Find missing
    const missing = kevIds.filter(id => !nvdIds.has(id));
    console.log(`Found ${missing.length} KEVs missing NVD data`);

    if (missing.length === 0) {
        console.log('All KEVs have NVD data. Exiting.');
        process.exit(0);
    }

    // Process all missing
    const batch = missing; // Process all
    let processed = 0;

    for (const cveId of batch) {
        if (processed % 10 === 0) console.log(`Progress: ${processed}/${batch.length}`);

        try {
            console.log(`Fetching ${cveId} from NVD...`);
            const response = await axios.get(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cveId}`, {
                headers: {
                    'apiKey': process.env.NVD_API_KEY || '',
                    'User-Agent': 'ThreatIntelDigest/1.0'
                },
                timeout: 10000
            });

            const vuln = response.data.vulnerabilities?.[0]?.cve;
            if (vuln) {
                const description = vuln.descriptions?.find((d: any) => d.lang === 'en')?.value || 'No description';

                let cvssV3Score = null, cvssV3Severity = null;
                const metrics = vuln.metrics;
                if (metrics?.cvssMetricV31?.[0]) {
                    cvssV3Score = metrics.cvssMetricV31[0].cvssData.baseScore;
                    cvssV3Severity = metrics.cvssMetricV31[0].cvssData.baseSeverity;
                } else if (metrics?.cvssMetricV30?.[0]) {
                    cvssV3Score = metrics.cvssMetricV30[0].cvssData.baseScore;
                    cvssV3Severity = metrics.cvssMetricV30[0].cvssData.baseSeverity;
                }

                await db.execute(sql`
                INSERT INTO vulnerabilities (id, description, published_date, last_modified_date, vuln_status, cvss_v3_score, cvss_v3_severity)
                VALUES (${cveId}, ${description}, ${vuln.published}, ${vuln.lastModified}, ${vuln.vulnStatus}, ${cvssV3Score ? String(cvssV3Score) : null}, ${cvssV3Severity})
                ON CONFLICT (id) DO UPDATE SET
                    cvss_v3_score = EXCLUDED.cvss_v3_score,
                    cvss_v3_severity = EXCLUDED.cvss_v3_severity
            `);
                processed++;
                console.log(`Upserted ${cveId}`);
            } else {
                console.log(`No data found for ${cveId}`);
            }

            await new Promise(r => setTimeout(r, 600)); // Rate limit
        } catch (e: any) {
            if (e.response?.status === 404) {
                console.log(`NVD 404 for ${cveId}`);
            } else {
                console.error(`Error processing ${cveId}:`, e.message);
            }
        }
    }

    console.log(`Done. Processed ${processed}/${batch.length}`);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
