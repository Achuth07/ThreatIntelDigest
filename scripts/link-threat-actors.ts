
import "dotenv/config";
import { getDb } from "../server/db";
import { articles, threatGroups, articleThreatGroups } from "../shared/schema";
import { sql, eq, and } from "drizzle-orm";

async function main() {
    console.log("Starting Threat Actor Linking...");

    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }

    const db = getDb();

    try {
        // 1. Fetch all threat groups and their aliases
        const groups = await db.select().from(threatGroups);
        console.log(`Loaded ${groups.length} threat groups for matching.`);

        // 2. Fetch recent articles (or all, but maybe limit for perf if many)
        // For now, let's process ALL articles that haven't been processed yet?
        // A simple way is to delete links and re-run, or just upsert.
        // For this MVP script, we iterate all recent articles.
        const recentArticles = await db
            .select({
                id: articles.id,
                title: articles.title,
                summary: articles.summary,
            })
            .from(articles)
            .orderBy(sql`${articles.publishedAt} DESC`)
            .limit(2000);
        console.log(`Scanning ${recentArticles.length} recent articles...`);

        let matchesFound = 0;

        for (const article of recentArticles) {
            const content = `${article.title} ${article.summary || ""}`.toLowerCase();

            for (const group of groups) {
                // Check Name
                const nameMatch = content.includes(group.name.toLowerCase());

                // Check Aliases
                // Need to be careful with short aliases, but MITRE aliases are usually distinct.
                // Cast aliases aliases to string[] because Drizzle jsonb is unknown
                const aliases = (group.aliases as string[]) || [];
                const aliasMatch = aliases.some(alias => content.includes(alias.toLowerCase()));

                if (nameMatch || aliasMatch) {
                    // Verify if link already exists
                    const existingLink = await db
                        .select()
                        .from(articleThreatGroups)
                        .where(
                            and(
                                eq(articleThreatGroups.articleId, article.id),
                                eq(articleThreatGroups.threatGroupId, group.id)
                            )
                        )
                        .limit(1);

                    if (existingLink.length === 0) {
                        await db.insert(articleThreatGroups).values({
                            articleId: article.id,
                            threatGroupId: group.id,
                        });
                        console.log(`Linked [${group.name}] to article: "${article.title.substring(0, 50)}..."`);
                        matchesFound++;
                    }
                }
            }
        }

        console.log(`\nLinking complete. New links created: ${matchesFound}`);
    } catch (error) {
        console.error("Linking failed:", error);
        process.exit(1);
    }
    process.exit(0);
}

main();
