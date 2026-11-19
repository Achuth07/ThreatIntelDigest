import { sql, type SQL } from 'drizzle-orm';
import { compileActors, findActors } from './actor-matching.js';

// Links threat actors to news articles and, through them, to CVEs (WHA-55).

interface Executor { execute(query: SQL): Promise<{ rows: any[] }> }
interface Database extends Executor { transaction<T>(run: (tx: Executor) => Promise<T>): Promise<T> }

// Roundups and bulletins name many CVEs and sometimes an actor in passing; pairing all of them
// would bury the useful links. Articles naming more CVEs than this are left out of actor-CVE links.
export const MAX_CVES_FOR_COOCCURRENCE = 10;

async function loadActors(db: Executor) {
  const { rows } = await db.execute(sql`SELECT id, name, aliases FROM threat_groups WHERE attack_status <> 'revoked'`);
  return compileActors(rows.map(row => ({ id: row.id, name: row.name, aliases: row.aliases ?? [] })));
}

// Recomputes article_threat_groups for the newest articles, adding new matches and removing ones
// the stricter matcher no longer finds.
export async function relinkArticleActors(db: Database, limit = 2000) {
  const actors = await loadActors(db);
  const { rows: articles } = await db.execute(sql`SELECT id, title, summary FROM articles ORDER BY published_at DESC LIMIT ${limit}`);
  const wanted: { articleId: string; groupId: string }[] = [];
  for (const article of articles) {
    for (const groupId of findActors(actors, `${article.title} ${article.summary ?? ''}`)) wanted.push({ articleId: article.id, groupId });
  }
  const articleIds = articles.map(article => article.id as string);

  return db.transaction(async tx => {
    const { rows: before } = await tx.execute(sql`SELECT count(*)::int AS n FROM article_threat_groups`);
    if (articleIds.length) await tx.execute(sql`DELETE FROM article_threat_groups WHERE article_id IN ${articleIds}`);
    for (let i = 0; i < wanted.length; i += 500) {
      const chunk = wanted.slice(i, i + 500);
      await tx.execute(sql`INSERT INTO article_threat_groups (article_id, threat_group_id) VALUES ${sql.join(chunk.map(link => sql`(${link.articleId}::uuid, ${link.groupId}::uuid)`), sql`, `)}`);
    }
    const { rows: after } = await tx.execute(sql`SELECT count(*)::int AS n FROM article_threat_groups`);
    return { articlesScanned: articles.length, linksBefore: before[0].n, linksAfter: after[0].n };
  });
}

// Rebuilds the 'news' rows of actor_cves from every article that ever named a CVE. article_cves
// keeps each article's title after the article is cleaned up, so links from old news survive;
// the summary is used while the article still exists.
export async function rebuildNewsActorCves(db: Database) {
  const actors = await loadActors(db);
  const { rows } = await db.execute(sql`
    SELECT l.article_url, max(l.title) AS title, max(l.published_at) AS published_at, max(a.summary) AS summary,
           array_agg(DISTINCT l.cve_id) AS cve_ids
    FROM article_cves l LEFT JOIN articles a ON a.id = l.article_id
    GROUP BY l.article_url
  `);

  // groupId|cveId -> newest article and how many articles back the pair
  const pairs = new Map<string, { groupId: string; cveId: string; title: string; url: string; publishedAt: Date; count: number }>();
  let articlesUsed = 0, skippedRoundups = 0;
  for (const row of rows) {
    const cveIds: string[] = row.cve_ids ?? [];
    const groupIds = findActors(actors, `${row.title} ${row.summary ?? ''}`);
    if (groupIds.length === 0) continue;
    if (cveIds.length > MAX_CVES_FOR_COOCCURRENCE) { skippedRoundups++; continue; }
    articlesUsed++;
    const publishedAt = new Date(row.published_at);
    for (const groupId of groupIds) {
      for (const cveId of cveIds) {
        const key = `${groupId}|${cveId}`;
        const existing = pairs.get(key);
        if (!existing) pairs.set(key, { groupId, cveId, title: row.title, url: row.article_url, publishedAt, count: 1 });
        else {
          existing.count++;
          if (publishedAt > existing.publishedAt) Object.assign(existing, { title: row.title, url: row.article_url, publishedAt });
        }
      }
    }
  }

  const links = [...pairs.values()];
  await db.transaction(async tx => {
    await tx.execute(sql`DELETE FROM actor_cves WHERE source = 'news'`);
    for (let i = 0; i < links.length; i += 500) {
      const chunk = links.slice(i, i + 500);
      await tx.execute(sql`
        INSERT INTO actor_cves (threat_group_id, cve_id, source, confidence, evidence, evidence_url, evidence_count)
        VALUES ${sql.join(chunk.map(link => sql`(${link.groupId}::uuid, ${link.cveId}, 'news', 'low', ${link.title}, ${link.url}, ${link.count})`), sql`, `)}
      `);
    }
  });
  return { articlesWithCves: rows.length, articlesUsed, skippedRoundups, links: links.length };
}
