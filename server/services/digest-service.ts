import { getDb } from '../db.js';
import { users, userPreferences, articles } from '@shared/schema.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { sendWeeklyDigestEmail } from '../email-service.js';

export const digestService = {
    async generateWeeklyDigest() {
        const db = getDb();
        if (!db) throw new Error("Database not initialized");

        console.log("Starting weekly digest generation...");

        // 1. Fetch users opted into weekly digest
        // We need users who have emailWeeklyDigest = true in preferences
        // AND their email is verified (optional but good practice)
        const recipients = await db.select({
            email: users.email,
            name: users.name,
        })
            .from(users)
            .innerJoin(userPreferences, eq(users.id, userPreferences.userId))
            .where(and(
                eq(userPreferences.emailWeeklyDigest, true),
                eq(users.emailVerified, true)
            ));

        console.log(`Found ${recipients.length} recipients for weekly digest.`);

        if (recipients.length === 0) {
            return { sent: 0, skipped: 0, errors: 0 };
        }

        // 2. Fetch top 5 articles from last 7 days
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

        console.log(`Found ${topArticles.length} articles for weekly digest.`);

        if (topArticles.length === 0) {
            console.log("No articles found, skipping digest.");
            return { sent: 0, skipped: recipients.length, errors: 0 };
        }

        // 3. Send emails
        let sentCount = 0;
        let errorCount = 0;

        for (const recipient of recipients) {
            try {
                await sendWeeklyDigestEmail(recipient.email, topArticles);
                sentCount++;
            } catch (error) {
                console.error(`Failed to send digest to ${recipient.email}:`, error);
                errorCount++;
            }
        }

        return { sent: sentCount, errors: errorCount, total: recipients.length };
    }
};
