// Links every stored article to the CVE IDs in its title and summary (WHA-54).
// Safe to re-run: links are upserted. Usage: npx tsx scripts/backfill_article_cves.ts [--dry-run]
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { getDb } from '../server/db.js';
import { extractCveMentions, linkArticleCves } from '../server/services/article-cves.js';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const db = getDb();
  const { rows } = await db.execute(sql`
    SELECT id, url, title, summary, source, published_at
    FROM articles
    WHERE title ~* 'CVE' OR summary ~* 'CVE'
  `);

  let articlesLinked = 0;
  let links = 0;
  const ids = new Set<string>();
  for (const row of rows as any[]) {
    const mentions = extractCveMentions({ title: row.title, summary: row.summary });
    if (mentions.size === 0) continue;
    articlesLinked++;
    mentions.forEach((_, id) => ids.add(id));
    links += dryRun
      ? mentions.size
      : await linkArticleCves(db, { id: row.id, url: row.url, title: row.title, source: row.source, publishedAt: row.published_at }, mentions);
  }

  console.log(`${dryRun ? '[dry run] ' : ''}Scanned ${rows.length} articles naming "CVE": ${articlesLinked} linked, ${links} links, ${ids.size} distinct CVEs`);
  process.exit(0);
}

main().catch(error => {
  console.error('Article CVE backfill failed:', error);
  process.exit(1);
});
