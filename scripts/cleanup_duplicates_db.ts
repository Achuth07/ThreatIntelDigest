#!/usr/bin/env tsx
/**
 * Database Cleanup Script - Remove Duplicate RSS Feeds
 * 
 * Run with: npx tsx scripts/cleanup_duplicates_db.ts
 */

import 'dotenv/config';
import { getDb } from '../server/db';
import { rssSources } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

async function cleanupDuplicates() {
    const db = getDb();
    console.log('🔍 Connecting to database...');

    try {
        // 1. Remove "PaloAlto Networks Unit 42" (Duplicate of "Palo Alto Unit 42")
        console.log('Checking for "PaloAlto Networks Unit 42"...');
        const paloAlto = await db.delete(rssSources)
            .where(eq(rssSources.name, "PaloAlto Networks Unit 42"))
            .returning();
        if (paloAlto.length > 0) console.log(`✅ Removed ${paloAlto.length} "PaloAlto Networks Unit 42"`);

        // 2. Remove "SANS Internet Storm Center" with the less detailed URL
        console.log('Checking for "SANS Internet Storm Center" (rssfeed.xml)...');
        const sans = await db.delete(rssSources)
            .where(and(
                eq(rssSources.name, "SANS Internet Storm Center"),
                eq(rssSources.url, "https://isc.sans.edu/rssfeed.xml")
            ))
            .returning();
        if (sans.length > 0) console.log(`✅ Removed ${sans.length} "SANS Internet Storm Center" (rssfeed.xml)`);

        // 3. Remove duplicate "The DFIR Report"
        // We want to keep one, so we'll fetch all and delete all but one.
        console.log('Checking for duplicate "The DFIR Report"...');
        const dfir = await db.select().from(rssSources).where(eq(rssSources.name, "The DFIR Report"));
        if (dfir.length > 1) {
            console.log(`Found ${dfir.length} "The DFIR Report" entries. Keeping the first one.`);
            // Sort by ID or creation time if available, but here just keep the first one found
            const toKeep = dfir[0];
            const toDelete = dfir.slice(1);

            for (const feed of toDelete) {
                await db.delete(rssSources).where(eq(rssSources.id, feed.id));
                console.log(`✅ Removed duplicate "The DFIR Report" (ID: ${feed.id})`);
            }
        } else {
            console.log('No duplicate "The DFIR Report" found.');
        }

        console.log('\n✨ Duplicate cleanup complete!');
    } catch (error) {
        console.error('\n❌ Error during cleanup:', error);
        process.exit(1);
    }
}

cleanupDuplicates()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
