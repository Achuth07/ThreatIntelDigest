
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { articles, bookmarks, rssSources, userSourcePreferences } from '../shared/schema';
import { eq, or, inArray } from 'drizzle-orm';
import ws from 'ws';
import * as dotenv from 'dotenv';
dotenv.config();

// Required for Neon serverless driver to work in Node.js environment
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
    console.log("Starting cleanup of Dark Reading and HackRead...");

    try {
        const sourcesToDelete = ["Dark Reading", "HackRead"];

        // 1. Get IDs of sources to delete
        const sources = await db.select({ id: rssSources.id, name: rssSources.name })
            .from(rssSources)
            .where(inArray(rssSources.name, sourcesToDelete));

        if (sources.length === 0) {
            console.log("No sources found to delete.");
            process.exit(0);
        }

        const sourceIds = sources.map(s => s.id);
        console.log(`Found ${sources.length} sources to delete:`, sources.map(s => s.name));

        // 2. Delete user preferences for these sources
        console.log("Deleting user source preferences...");
        await db.delete(userSourcePreferences)
            .where(inArray(userSourcePreferences.sourceId, sourceIds));

        // 3. Delete articles from these sources
        console.log("Deleting articles...");

        // We can delete by source name directly since articles have 'source' column as string name
        const resultArticles = await db.delete(articles)
            .where(inArray(articles.source, sourcesToDelete))
            .returning({ id: articles.id });

        console.log(`Deleted ${resultArticles.length} articles.`);

        // 4. Delete the sources themselves
        console.log("Deleting RSS sources...");
        await db.delete(rssSources)
            .where(inArray(rssSources.id, sourceIds));

        console.log("Cleanup completed successfully.");
    } catch (error) {
        console.error("Error during cleanup:", error);
    } finally {
        await pool.end();
    }
}

main();
