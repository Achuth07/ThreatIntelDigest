import { config } from 'dotenv';
config();
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function cleanupSource(url: string, description: string) {
    console.log(`Processing removal for: ${description} (${url})`);

    try {
        // 1. Get Source ID
        const sources = await sql`SELECT id, name FROM rss_sources WHERE url = ${url}`;

        if (sources.length === 0) {
            console.log(`- Source not found in database.`);
            return;
        }

        const sourceId = sources[0].id;
        console.log(`- Found source ID: ${sourceId} (Name: ${sources[0].name})`);

        // 2. Delete preferences
        const prefResult = await sql`DELETE FROM user_source_preferences WHERE source_id = ${sourceId} RETURNING user_id`;
        console.log(`- Deleted ${prefResult.length} user preferences.`);

        // 3. Delete source
        const delResult = await sql`DELETE FROM rss_sources WHERE id = ${sourceId} RETURNING id`;
        console.log(`- Deleted source record.`);
    } catch (err) {
        console.error(`- Error processing ${url}:`, err);
    }
}

async function run() {
    try {
        console.log('Starting cleanup...');

        // Cisco Duplicate (Generic feed)
        await cleanupSource('https://blogs.cisco.com/feed', 'Cisco Generic Blog');

        // ESET Legacy (HTTP feed)
        await cleanupSource('http://eset.com/int/rss.xml', 'ESET Legacy');

        console.log('Cleanup complete.');
    } catch (e) {
        console.error('Fatal error:', e);
    }
}

run();
