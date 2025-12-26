
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { vulnerabilities, knownExploitedVulnerabilities } from '../shared/schema';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function debugJoin() {
    try {
        // 1. Count total CVEs
        const cveCount = await db.execute(sql`SELECT count(*) FROM ${vulnerabilities}`);
        console.log(`Total Vulnerabilities: ${cveCount.rows[0].count}`);

        // 2. Count KEVs
        const kevCount = await db.execute(sql`SELECT count(*) FROM ${knownExploitedVulnerabilities}`);
        console.log(`Total KEVs: ${kevCount.rows[0].count}`);

        // 3. Count Overlap
        const overlap = await db.execute(sql`
      SELECT count(*) 
      FROM ${vulnerabilities} v
      JOIN ${knownExploitedVulnerabilities} kev ON v.id = kev.cve_id
    `);
        console.log(`Overlap Count: ${overlap.rows[0].count}`);

        // 4. Sample IDs from both to check format
        const sampleV = await db.execute(sql`SELECT id FROM ${vulnerabilities} LIMIT 3`);
        console.log('Sample Vulnerabilities IDs:', sampleV.rows);

        const sampleK = await db.execute(sql`SELECT cve_id FROM ${knownExploitedVulnerabilities} LIMIT 3`);
        console.log('Sample KEV IDs:', sampleK.rows);

    } catch (error) {
        console.error('Error debugging join:', error);
    } finally {
        process.exit(0);
    }
}

debugJoin();
