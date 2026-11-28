import { beforeAll, describe, expect, it } from 'vitest';
import { useTestDb } from '../helpers/db.js';
import { apiKey, call } from '../helpers/request.js';
import { expectContract } from '../helpers/contract.js';
import { ARTICLE_2, ARTICLE_ID, PRIVATE_ARTICLE } from '../helpers/seed.js';
import { SUMMARY_MAX } from '../../server/api-v1/lib/text.js';

useTestDb();

let key: string;
beforeAll(async () => { key = await apiKey(['news:read']); });

async function list(query = '') {
  const res = await call(`/v1/news${query ? `?${query}` : ''}`, { key });
  const body = await expectContract(res, 'GET', '/news');
  return { res, body, ids: res.status === 200 ? body.results.map((r: any) => r.id) : [] };
}

describe('GET /v1/news', () => {
  it('lists articles from curated sources, newest first', async () => {
    const { res, body, ids } = await list();
    expect(res.status).toBe(200);
    expect(ids).toEqual([ARTICLE_2, ARTICLE_ID]);
    expect(ids).not.toContain(PRIVATE_ARTICLE);
    expect(body.count).toBe(2);
  });

  it('returns a short plain-text summary, never the full article', async () => {
    const { body } = await list();
    const item = body.results.find((r: any) => r.id === ARTICLE_ID);
    expect(item.title).toBe('FortiOS bug "exploited"');
    expect(item.summary.length).toBeLessThanOrEqual(SUMMARY_MAX);
    expect(item.summary.startsWith('Attackers & partners exploited FortiOS.')).toBe(true);
    expect(item.summary.endsWith('…')).toBe(true);
    expect(item.summary).not.toMatch(/<[a-z/]|&amp;/i);
    expect(JSON.stringify(body)).not.toContain('Full article text that must never be served in full. '.repeat(10));
  });

  it('links CVEs and threat actors', async () => {
    const { body } = await list();
    const item = body.results.find((r: any) => r.id === ARTICLE_ID);
    expect(item).toMatchObject({
      threat_level: 'critical', tags: ['Zero-Day'], targeted_industries: ['Government', 'Energy'], cves: ['CVE-2024-0001'],
      threat_actors: [{ name: 'Test Panda', attack_id: 'G9999', whatcyber_url: 'https://www.whatcyber.com/threat-actors/test-panda' }],
      links: { whatcyber: `https://www.whatcyber.com/article/${ARTICLE_ID}` },
    });
  });

  it.each([
    ['search=fortios exploited', [ARTICLE_ID]],
    ['search=quiet', [ARTICLE_2]],
    ['search=100%25', []],
    ['source=bleeping computer', [ARTICLE_ID]],
    ['source=My Private Feed', []],
    ['threat_level=critical', [ARTICLE_ID]],
    ['threat_level=medium,high', [ARTICLE_2]],
    ['tag=zero-day', [ARTICLE_ID]],
    ['industry=energy', [ARTICLE_ID]],
    ['cve=cve-2024-0001', [ARTICLE_ID]],
    ['threat_actor=G9999', [ARTICLE_ID]],
    ['threat_actor=test-panda', [ARTICLE_ID]],
    ['published_after=2024-03-05', [ARTICLE_2]],
    ['published_before=2024-03-05', [ARTICLE_ID]],
  ])('filters with %s', async (query, expected) => {
    const { res, body, ids } = await list(query);
    expect(res.status).toBe(200);
    expect(ids).toEqual(expected);
    expect(body.count).toBe(expected.length);
  });

  it('sorts oldest first when asked', async () => {
    expect((await list('sort=published')).ids).toEqual([ARTICLE_ID, ARTICLE_2]);
  });

  it.each([['threat_level=severe'], ['cve=log4j'], ['published_after=yesterday'], ['sort=title']])('rejects %s', async query => {
    expect((await list(query)).res.status).toBe(400);
  });

  it('needs news:read', async () => {
    expect((await call('/v1/news', { key: await apiKey(['catalog:read']) })).status).toBe(403);
  });
});

describe('GET /v1/news/{id}', () => {
  it('returns one article', async () => {
    const res = await call(`/v1/news/${ARTICLE_ID.toUpperCase()}`, { key });
    expect(res.status).toBe(200);
    expect((await expectContract(res, 'GET', '/news/{id}')).id).toBe(ARTICLE_ID);
  });

  it('returns 404 for private-feed and unknown articles, 400 for a bad id', async () => {
    expect((await call(`/v1/news/${PRIVATE_ARTICLE}`, { key })).status).toBe(404);
    expect((await call('/v1/news/99999999-9999-4999-8999-999999999999', { key })).status).toBe(404);
    const bad = await call('/v1/news/123', { key });
    expect(bad.status).toBe(400);
    await expectContract(bad, 'GET', '/news/{id}');
  });
});

describe('GET /v1/sources', () => {
  it('lists active curated sources only', async () => {
    const res = await call('/v1/sources', { key });
    const body = await expectContract(res, 'GET', '/sources');
    expect(body.results).toEqual([
      { name: 'Bleeping Computer', category: 'news', feed_url: 'https://www.bleepingcomputer.com/feed/', site_url: 'https://www.bleepingcomputer.com', article_count: 1, last_fetched_at: '2026-11-28T01:00:00.000Z' },
      { name: 'The Hacker News', category: 'news', feed_url: 'http://feeds.feedburner.com/TheHackersNews?format=xml', site_url: 'http://feeds.feedburner.com', article_count: 1, last_fetched_at: null },
    ]);
    expect(body.count).toBe(2);
  });

  it('pages', async () => {
    const res = await call('/v1/sources?page_size=1&page=2', { key });
    const body = await expectContract(res, 'GET', '/sources');
    expect(body.results.map((s: any) => s.name)).toEqual(['The Hacker News']);
    expect(body.previous).toBe('http://localhost/v1/sources?page_size=1&page=1');
  });
});
