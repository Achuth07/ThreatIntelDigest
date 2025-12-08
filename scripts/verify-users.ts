import 'dotenv/config';
import { getDb } from '../server/db.js';
import { users } from '../shared/schema.js';
import { inArray } from 'drizzle-orm';

async function main() {
    console.log('🔓 Manually verifying pending users...');
    const db = getDb();
    if (!db) throw new Error("Database not initialized");

    const targetEmails = [
        'tapodiadrian@gmail.com',
        'aricci@cenhud.com',
        'ronaldennis@gmail.com',
        'christian.care@richmondnational.com'
    ];

    const result = await db.update(users)
        .set({ emailVerified: true })
        .where(inArray(users.email, targetEmails))
        .returning({ email: users.email });

    console.log(`✅ Successfully verified ${result.length} users:`);
    result.forEach(u => console.log(`- ${u.email}`));

    process.exit(0);
}

main();
