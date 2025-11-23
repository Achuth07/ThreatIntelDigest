#!/usr/bin/env tsx
/**
 * Database Cleanup Script - Remove Non-Working RSS Feeds
 * 
 * This script removes all non-working RSS feeds from the database.
 * User preferences for these feeds will be automatically deleted via cascade.
 * 
 * Run with: npx tsx scripts/cleanup_broken_feeds_db.ts
 */

import 'dotenv/config';
import { getDb } from '../server/db';
import { rssSources } from '../shared/schema';
import { inArray } from 'drizzle-orm';

// List of feed names to remove from the database
const FEEDS_TO_REMOVE = [
    // HTTP 404 Not Found
    "Trustwave SpiderLabs",
    "Anomali",
    "FortiGuard Labs",
    "Microsoft Security Response Center",
    "Recorded Future (Cyber Threat Intelligence)",
    "Recorded Future (Threat Intelligence)",
    "Recorded Future (Vulnerability Management)",
    "Recorded Future (Research)",
    "Recorded Future (Geopolitical Intelligence)",
    "HackerOne",

    // HTTP 403 Forbidden (Bot Protection)
    "Tripwire",
    "PhishLabs",
    "vx-underground",
    "Anton on Security",
    "Dark Reading (all)",
    "HACKMAGEDDON",

    // HTTP 500 / XML Errors
    "Dell SecureWorks (Research & Intelligence)",
    "Webroot Threat Blog",
    "IBM Security Intelligence",
    "Signals Corps",
    "TrustArc",
    "SpecterOps",
    "BSI RSS-Newsfeed",
    "Infosec Institute (malware analysis)",
    "Infosec Institute (news)",
    "Infosec Institute (threat intelligence)",
    "Naked Security (Sophos)",

    // Legacy/Replaced feeds
    "Google Mandiant Threat Intelligence", // Replaced with Google Online Security
    "CIO Magazine (Security)", // Replaced with CSO Online
    "Digital Shadows", // Acquired, no longer active
    "Fortinet (Threat Research)", // Duplicate/Legacy
    "We Live Security (ESET)", // Old URL, replaced
    "CISA Alerts (US)", // RSS discontinued
    "NCSC Threat Reports (UK)", // 404
    "DHS (Automated Indicator Sharing)", // 404
    "Motherboard (tech)", // 404
];

async function cleanupBrokenFeeds() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.log('⚠️  No DATABASE_URL found. Skipping database cleanup.');
        console.log('   (This is fine if you\'re using in-memory storage)');
        return;
    }

    console.log('🔍 Connecting to database...');
    const db = getDb();

    try {
        // First, check which feeds exist in the database
        console.log('\n📊 Checking for feeds to remove...');
        const existingFeeds = await db
            .select()
            .from(rssSources)
            .where(inArray(rssSources.name, FEEDS_TO_REMOVE));

        if (existingFeeds.length === 0) {
            console.log('✅ No broken feeds found in database. Database is clean!');
            return;
        }

        console.log(`\n⚠️  Found ${existingFeeds.length} broken feeds in database:`);
        existingFeeds.forEach((feed: any) => {
            console.log(`   - ${feed.name}`);
        });

        // Delete the feeds (user preferences will be cascade deleted automatically)
        console.log('\n🗑️  Removing broken feeds from database...');
        const result = await db
            .delete(rssSources)
            .where(inArray(rssSources.name, FEEDS_TO_REMOVE))
            .returning();

        console.log(`\n✅ Successfully removed ${result.length} feeds from database`);
        console.log('   User preferences for these feeds were automatically deleted (cascade)');

        console.log('\n📋 Removed feeds:');
        result.forEach((feed: any) => {
            console.log(`   ✓ ${feed.name}`);
        });

        console.log('\n✨ Database cleanup complete!');

    } catch (error) {
        console.error('\n❌ Error during cleanup:', error);
        process.exit(1);
    }
}

// Run the cleanup
cleanupBrokenFeeds()
    .then(() => {
        console.log('\n✅ Cleanup script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Cleanup script failed:', error);
        process.exit(1);
    });
