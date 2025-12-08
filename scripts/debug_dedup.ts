import 'dotenv/config';
import { getDb } from '../server/db.js';
import { articles } from '../shared/schema.js';
import { desc, ilike } from 'drizzle-orm';

async function main() {
    console.log("Debugging React2Shell duplicates...");
    const db = getDb();

    // Fetch recent articles mentioning React2Shell
    const candidates = await db.select({
        title: articles.title,
        id: articles.id,
        source: articles.source
    })
        .from(articles)
        .where(ilike(articles.title, '%React2Shell%'))
        .orderBy(desc(articles.publishedAt))
        .limit(10);

    console.log(`Found ${candidates.length} React2Shell articles:`);
    candidates.forEach((c, i) => console.log(`${i + 1}. [${c.source}] ${c.title}`));

    console.log("\nTesting deduplication logic:");

    const getWords = (str: string) => {
        return new Set(str.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3));
    };

    const COMMON_SECURITY_TERMS = new Set([
        'vulnerability', 'exploited', 'hackers', 'attack', 'security',
        'critical', 'breach', 'update', 'patch', 'released', 'active',
        'confirmed', 'severe', 'severity', 'under', 'groups', 'target',
        'addresses', 'vulnerable', 'added', 'after', 'started', 'newly',
        'disclosed'
    ]);

    const isSignificant = (word: string) => {
        return word.length > 5 && !COMMON_SECURITY_TERMS.has(word);
    };

    for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) {
            const t1 = candidates[i].title;
            const t2 = candidates[j].title;

            const words1 = getWords(t1);
            const words2 = getWords(t2);

            const intersection = [...words1].filter(x => words2.has(x));
            const significantMatches = intersection.filter(isSignificant);

            console.log(`\nComparing:\n A: "${t1}"\n B: "${t2}"`);
            console.log(` Intersection: [${intersection.join(', ')}]`);
            console.log(` Significant Matches: [${significantMatches.join(', ')}]`);

            if (significantMatches.length > 0) {
                console.log(" -> MATCH (Duplicate)");
            } else {
                console.log(" -> NO MATCH");
            }
        }
    }

    process.exit(0);
}

main();
