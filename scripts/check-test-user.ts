import 'dotenv/config';
import { getDb } from '../server/db.js';
import { users } from '../shared/schema.js';
import { eq, or } from 'drizzle-orm';

async function main() {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");

    const found = await db.select().from(users).where(
        or(
            eq(users.email, 'achuth@umd.edu'),
            eq(users.email, 'achuthumd@gmail.com')
        )
    );
    console.log("Found users:", found.map(u => u.email));
    process.exit(0);
}
main();
