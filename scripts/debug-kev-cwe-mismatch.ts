
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { vulnerabilities, knownExploitedVulnerabilities, cweCategories } from '../shared/schema';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function debug() {
    try {
        console.log('--- Debugging KEV <-> CWE Connection ---');

        // 1. Total KEVs
        const totalKevs = await db.execute(sql`SELECT count(*) FROM ${knownExploitedVulnerabilities}`);
        console.log(`Total KEVs: ${totalKevs.rows[0].count}`);

        // 2. KEVs that exist in Vulnerabilities table
        const kevsInVuln = await db.execute(sql`
      SELECT count(*) 
      FROM ${knownExploitedVulnerabilities} k
      JOIN ${vulnerabilities} v ON k.cve_id = v.id
    `);
        console.log(`KEVs present in Vulnerabilities table: ${kevsInVuln.rows[0].count}`);

        // 3. KEVs in Vuln table that have NON-EMPTY weaknesses
        const kevsWithWeaknesses = await db.execute(sql`
        SELECT count(*)
        FROM ${knownExploitedVulnerabilities} k
        JOIN ${vulnerabilities} v ON k.cve_id = v.id
        WHERE cardinality(v.weaknesses) > 0
    `);
        console.log(`KEVs with at least one weakness listed: ${kevsWithWeaknesses.rows[0].count}`);

        // 4. Sample Weaknesses format
        const sample = await db.execute(sql`
        SELECT v.id, v.weaknesses
        FROM ${knownExploitedVulnerabilities} k
        JOIN ${vulnerabilities} v ON k.cve_id = v.id
        WHERE cardinality(v.weaknesses) > 0
        LIMIT 5
    `);
        console.log('Sample KEV Weaknesses:', JSON.stringify(sample.rows, null, 2));

        // 5. Check CWE Categories format
        const cweSample = await db.execute(sql`SELECT id, name FROM ${cweCategories} LIMIT 5`);
        console.log('Sample CWE Categories:', JSON.stringify(cweSample.rows, null, 2));

        // 6. Check Join Success Rate
        // How many KEVs successfully join to a CWE Category?
        const joinCheck = await db.execute(sql`
        SELECT count(DISTINCT k.cve_id)
        FROM ${knownExploitedVulnerabilities} k
        JOIN ${vulnerabilities} v ON k.cve_id = v.id
        CROSS JOIN LATERAL unnest(v.weaknesses) as w_id
        JOIN ${cweCategories} cc ON cc.id = w_id
    `);
        console.log(`KEVs effectively linked to a known CWE Category: ${joinCheck.rows[0].count}`);

    } catch (error: any) {
        console.error('Debug Error:', error.message);
    } finally {
        process.exit(0);
    }
}

debug();
