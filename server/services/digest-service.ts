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
            .limit(100);

        console.log(`Found ${topArticles.length} candidate articles. Prioritizing and deduplicating...`);

        // 1. Prioritize Sources
        const PRIORITY_SOURCES = new Set([
            'US-Cert (Alerts)',
            'Unit 42',
            'Bleeping Computer',
            'Center for Internet Security (Advisories)',
            'ESET WeLiveSecurity',
            'Malwarebytes Labs',
            'McAfee Labs',
            '0patch Blog',
            'Bitdefender Labs'
        ]);

        const getThreatScore = (level: string | null) => {
            switch (level?.toUpperCase()) {
                case 'CRITICAL': return 4;
                case 'HIGH': return 3;
                case 'MEDIUM': return 2;
                default: return 1;
            }
        };

        // Sort candidates: Priority Source -> Threat Level -> Date
        topArticles.sort((a, b) => {
            const aPriority = PRIORITY_SOURCES.has(a.source) ? 1 : 0;
            const bPriority = PRIORITY_SOURCES.has(b.source) ? 1 : 0;

            if (aPriority !== bPriority) return bPriority - aPriority; // Priority first

            const aThreat = getThreatScore(a.threatLevel);
            const bThreat = getThreatScore(b.threatLevel);

            if (aThreat !== bThreat) return bThreat - aThreat; // Higher threat first

            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(); // Newer first
        });

        // Advanced Deduplication: Significant Token Overlap
        // This caches duplicates by checking for rare/specific words (entities) shared between titles.

        const getWords = (str: string) => {
            return new Set(str.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3));
        };

        const COMMON_SECURITY_TERMS = new Set([
            'vulnerability', 'exploited', 'hackers', 'attack', 'security',
            'critical', 'breach', 'update', 'patch', 'released', 'active',
            'confirmed', 'severe', 'severity', 'under', 'groups', 'target',
            'addresses', 'vulnerable', 'added', 'after', 'started', 'newly',
            'disclosed', 'remote', 'execution', 'code', 'bypass', 'zero-day',
            'authentication', 'injection', 'service', 'denial', 'issues'
        ]);

        const isSignificant = (word: string) => {
            // Words longer than 5 chars that are NOT in the common list are "significant"
            // This captures things like "React2Shell", "Cloudflare", "Fortinet", "PanOS"
            return word.length > 5 && !COMMON_SECURITY_TERMS.has(word);
        };

        const uniqueArticles: typeof topArticles = [];

        for (const article of topArticles) {
            if (uniqueArticles.length >= 5) break;

            let isDuplicate = false;
            for (const existing of uniqueArticles) {
                const words1 = getWords(article.title);
                const words2 = getWords(existing.title);

                // key intersection
                const intersection = [...words1].filter(x => words2.has(x));

                // If they share ANY "significant" word, it's likely the same story
                const significantMatches = intersection.filter(isSignificant);

                // Fallback: If they share > 40% of standard words (Jaccard-ish)
                const union = new Set([...words1, ...words2]);
                const jaccard = union.size === 0 ? 0 : intersection.length / union.size;

                if (significantMatches.length > 0) {
                    console.log(`Skipping duplicate (Significant Token: ${significantMatches.join(', ')}): "${article.title}" (matches "${existing.title}")`);
                    isDuplicate = true;
                    break;
                }

                if (jaccard > 0.4 || article.title.toLowerCase().includes(existing.title.toLowerCase())) {
                    console.log(`Skipping duplicate (Similarity ${jaccard.toFixed(2)}): "${article.title}" (matches "${existing.title}")`);
                    isDuplicate = true;
                    break;
                }
            }

            if (!isDuplicate) {
                uniqueArticles.push(article);
            }
        }

        console.log(`Selected ${uniqueArticles.length} unique articles for digest.`);

        if (uniqueArticles.length === 0) {
            console.log("No articles found after deduplication, skipping digest.");
            return { sent: 0, skipped: recipients.length, errors: 0 };
        }

        // 3. Send emails
        let sentCount = 0;
        let errorCount = 0;

        for (const recipient of recipients) {
            try {
                await sendWeeklyDigestEmail(recipient.email, uniqueArticles);
                sentCount++;
            } catch (error) {
                console.error(`Failed to send digest to ${recipient.email}:`, error);
                errorCount++;
            }
        }

        return { sent: sentCount, errors: errorCount, total: recipients.length };
    }
};
