
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { vulnerabilities, knownExploitedVulnerabilities } from '../shared/schema';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const NVD_API_KEY = process.env.NVD_API_KEY;
const BATCH_SIZE = 50; // Process 50 items
const DELAY_MS = 1000; // 1 second delay between requests

async function backfill() {
    console.log('Starting backfill...');

    if (!NVD_API_KEY) {
        console.error('NVD_API_KEY is missing');
        process.exit(1);
    }

    // 1. Get KEV IDs
    const kevResult = await db.execute(sql`SELECT cve_id FROM ${knownExploitedVulnerabilities}`);
    const kevIds = new Set(kevResult.rows.map((r: any) => r.cve_id));

    // 2. Get Existing NVD IDs
    const nvdResult = await db.execute(sql`SELECT id FROM ${vulnerabilities}`);
    const nvdIds = new Set(nvdResult.rows.map((r: any) => r.id));

    // 3. Find missing
    const missing = [...kevIds].filter(id => !nvdIds.has(id));
    console.log(`Found ${missing.length} KEVs missing from NVD table.`);

    if (missing.length === 0) {
        console.log('No missing items.');
        process.exit(0);
    }

    // 4. Process All
    const toProcess = missing;
    console.log(`Processing all ${toProcess.length} missing items...`);

    let successCount = 0;
    let processedCount = 0;

    for (const cveId of toProcess) {
        processedCount++;
        try {
            if (processedCount % 10 === 0) {
                console.log(`Progress: ${processedCount}/${toProcess.length} (${Math.round(processedCount / toProcess.length * 100)}%)`);
            }

            console.log(`Fetching ${cveId}...`);
            const response = await axios.get(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cveId}`, {
                headers: {
                    'apiKey': NVD_API_KEY
                },
                timeout: 10000
            });

            const vuln = response.data.vulnerabilities?.[0]?.cve;

            if (vuln) {
                // Extract Data
                const description = vuln.descriptions?.find((d: any) => d.lang === 'en')?.value || 'No description';

                let cvssV3Score = null, cvssV3Severity = null;
                let cvssV2Score = null, cvssV2Severity = null;

                const metrics = vuln.metrics;
                if (metrics?.cvssMetricV31?.[0]) {
                    cvssV3Score = metrics.cvssMetricV31[0].cvssData.baseScore;
                    cvssV3Severity = metrics.cvssMetricV31[0].cvssData.baseSeverity;
                } else if (metrics?.cvssMetricV30?.[0]) {
                    cvssV3Score = metrics.cvssMetricV30[0].cvssData.baseScore;
                    cvssV3Severity = metrics.cvssMetricV30[0].cvssData.baseSeverity;
                }

                if (metrics?.cvssMetricV2?.[0]) {
                    cvssV2Score = metrics.cvssMetricV2[0].cvssData.baseScore;
                    cvssV2Severity = metrics.cvssMetricV2[0].baseSeverity;
                }

                const weaknesses = vuln.weaknesses?.map((w: any) => w.description[0].value) || [];
                const references = vuln.references?.map((r: any) => ({ url: r.url, source: r.source })) || [];

                // Format Postgres Array Literal for text[]
                const weaknessesArray = weaknesses.length > 0
                    ? `{${weaknesses.map((w: string) => `"${w.replace(/"/g, '\\"')}"`).join(',')}}`
                    : '{}';

                // Insert
                await db.execute(sql`
            INSERT INTO ${vulnerabilities} (
                id, description, published_date, last_modified_date, vuln_status, 
                cvss_v3_score, cvss_v3_severity, cvss_v2_score, cvss_v2_severity,
                weaknesses, reference_urls, created_at
            ) VALUES (
                ${cveId}, ${description}, ${new Date(vuln.published)}, ${new Date(vuln.lastModified)}, ${vuln.vulnStatus},
                ${cvssV3Score ? String(cvssV3Score) : null}, ${cvssV3Severity}, ${cvssV2Score ? String(cvssV2Score) : null}, ${cvssV2Severity},
                ${weaknessesArray}::text[], ${JSON.stringify(references)}::jsonb, NOW()
            )
            ON CONFLICT (id) DO NOTHING
        `);

                successCount++;
            } else {
                console.log(`No data found for ${cveId}`);
            }

        } catch (err: any) {
            console.error(`Error processing ${cveId}:`, err.message);
        }

        // Rate limit delay
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    console.log(`Backfill complete. Successfully added ${successCount} entries.`);
    process.exit(0);
}


backfill();
