import 'dotenv/config';
import { getDb } from '../server/db.js';
import { users, userPreferences } from '../shared/schema.js';
import { eq, inArray } from 'drizzle-orm';

async function main() {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");

    const targetEmails = [
        'tapodiadrian@gmail.com',
        'aricci@cenhud.com',
        'ronaldennis@gmail.com',
        'christian.care@richmondnational.com',
        'achuthumd@gmail.com' // Reference (received mail)
    ];

    console.log("🔍 Checking status for targets:", targetEmails);

    const results = await db.select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        hasPreferences: userPreferences.id,
        weeklyDigest: userPreferences.emailWeeklyDigest
    })
        .from(users)
        .leftJoin(userPreferences, eq(users.id, userPreferences.userId))
        .where(inArray(users.email, targetEmails));

    console.log("\n📊 Results:");
    console.table(results.map(r => ({
        email: r.email,
        verified: r.emailVerified,
        optedIn: r.weeklyDigest,
        eligible: r.emailVerified && r.weeklyDigest
    })));

    process.exit(0);
}

main();
