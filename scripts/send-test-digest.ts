import 'dotenv/config';
import { getDb } from '../server/db.js';
import { articles } from '../shared/schema.js';
import { gte, desc, sql } from 'drizzle-orm';
import { sendWeeklyDigestEmail } from '../server/email-service.js';

async function main() {
    const TEST_EMAIL = 'achuth@umd.edu';
    console.log(`Starting manual digest test for ${TEST_EMAIL}...`);

    const db = getDb();
    if (!db) throw new Error("Database not initialized");

    // Fetch top 5 articles from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Custom sorting for threat level
    // CRITICAL (1) > HIGH (2) > MEDIUM (3) > LOW (4)
    const threatLevelOrder = sql`
    CASE 
      WHEN ${articles.threatLevel} = 'CRITICAL' THEN 1
      WHEN ${articles.threatLevel} = 'HIGH' THEN 2
      WHEN ${articles.threatLevel} = 'MEDIUM' THEN 3
      ELSE 4
    END
  `;

    console.log('Fetching top articles...');
    const topArticles = await db.select({
        id: articles.id,
        title: articles.title,
        summary: articles.summary,
        url: articles.url,
        source: articles.source,
        publishedAt: articles.publishedAt,
        threatLevel: articles.threatLevel,
        readTime: articles.readTime,
    })
        .from(articles)
        .where(gte(articles.publishedAt, sevenDaysAgo))
        .orderBy(threatLevelOrder, desc(articles.publishedAt))
        .limit(5);

    console.log(`Found ${topArticles.length} articles.`);

    if (topArticles.length === 0) {
        console.log("No articles found. Cannot send test email.");
        return;
    }

    try {
        console.log(`Sending test email to ${TEST_EMAIL}...`);
        await sendWeeklyDigestEmail(TEST_EMAIL, topArticles);
        console.log('Test email sent successfully!');
    } catch (error) {
        console.error('Failed to send test email:', error);
    } finally {
        process.exit(0);
    }
}

main();
