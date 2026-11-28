import { z } from '@hono/zod-openapi';
import { toIso } from '../lib/responses.js';
import { SUMMARY_MAX, plainText, shortSummary } from '../lib/text.js';
import { SITE } from './cve.js';

// News serialisers for v1 (WHA-63). Title, a short plain-text summary and the link only: the API
// never serves an article's full text.

export const THREAT_LEVELS = ['critical', 'high', 'medium', 'low'] as const;

const LinkedActor = z.object({ name: z.string(), attack_id: z.string().nullable(), whatcyber_url: z.string().nullable() });

export const NewsItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  summary: z.string().nullable().openapi({ description: `The feed's summary as plain text, at most ${SUMMARY_MAX} characters.` }),
  url: z.string().openapi({ description: 'The article on the publisher\'s site.' }),
  source: z.string(),
  published_at: z.string().datetime(),
  threat_level: z.enum(THREAT_LEVELS).nullable().openapi({ description: "WhatCyber's rating of the story." }),
  tags: z.array(z.string()),
  targeted_industries: z.array(z.string()),
  cves: z.array(z.string()),
  threat_actors: z.array(LinkedActor),
  links: z.object({ whatcyber: z.string() }),
}).openapi('NewsItem');

export function serializeNewsItem(row: any): z.infer<typeof NewsItemSchema> {
  const level = String(row.threat_level ?? '').toLowerCase();
  return {
    id: row.id,
    title: plainText(row.title),
    summary: shortSummary(row.summary),
    url: row.url,
    source: row.source,
    published_at: toIso(row.published_at)!,
    threat_level: (THREAT_LEVELS as readonly string[]).includes(level) ? level as (typeof THREAT_LEVELS)[number] : null,
    tags: row.tags ?? [],
    targeted_industries: Array.isArray(row.targeted_industries) ? row.targeted_industries : [],
    cves: row.cves ?? [],
    threat_actors: (row.actors ?? []).map((a: any) => ({ name: a.name, attack_id: a.attack_id ?? null, whatcyber_url: a.slug ? `${SITE}/threat-actors/${a.slug}` : null })),
    links: { whatcyber: `${SITE}/article/${row.id}` },
  };
}

export const SourceSchema = z.object({
  name: z.string().openapi({ description: 'Use as the source filter on /news.' }),
  category: z.enum(['vendor_research', 'government', 'malware_research', 'news']),
  feed_url: z.string(),
  site_url: z.string(),
  article_count: z.number().int().openapi({ description: 'Articles from this source in the last 30 days.' }),
  last_fetched_at: z.string().datetime().nullable(),
}).openapi('Source');
