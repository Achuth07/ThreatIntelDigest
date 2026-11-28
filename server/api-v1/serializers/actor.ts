import { z } from '@hono/zod-openapi';
import { cleanAttackText } from '../../services/attack-import.js';
import { toIso, toNumber } from '../lib/responses.js';
import { shortSummary } from '../lib/text.js';
import { Cvss, SITE, bestCvss } from './cve.js';

// Threat actor serialisers for v1 (WHA-62). Actors are identified by their ATT&CK id (G0016),
// never by WhatCyber's internal UUID.

const attackGroupUrl = (id: string | null) => (id ? `https://attack.mitre.org/groups/${id}/` : null);

export const ActorItemSchema = z.object({
  id: z.string().openapi({ description: 'The ATT&CK group id, e.g. G0016. Also accepted: slug.', example: 'G0016' }),
  slug: z.string().nullable().openapi({ example: 'apt29' }),
  name: z.string(),
  aliases: z.array(z.string()),
  description: z.string().nullable().openapi({ description: 'Shortened in lists; full on the detail route.' }),
  last_updated: z.string().datetime().nullable().openapi({ description: 'When ATT&CK last changed the group.' }),
  latest_article_at: z.string().datetime().nullable().openapi({ description: 'Newest news article naming the group.' }),
  counts: z.object({ techniques: z.number().int(), software: z.number().int(), cves: z.number().int(), articles: z.number().int() }),
  links: z.object({ attack: z.string().nullable(), whatcyber: z.string().nullable() }),
}).openapi('ThreatActor');

export const ActorDetailSchema = ActorItemSchema.extend({
  software: z.array(z.object({ id: z.string(), name: z.string(), type: z.string(), url: z.string() })),
}).openapi('ThreatActorDetail');

export function serializeActorItem(row: any, fullDescription = false): z.infer<typeof ActorItemSchema> {
  const description = cleanAttackText(row.description);
  return {
    id: row.attack_id,
    slug: row.slug ?? null,
    name: row.name,
    aliases: (Array.isArray(row.aliases) ? row.aliases : []).filter((a: string) => a !== row.name),
    description: description ? (fullDescription ? description : shortSummary(description)) : null,
    last_updated: toIso(row.last_updated),
    latest_article_at: toIso(row.latest_article_at),
    counts: { techniques: Number(row.technique_count ?? 0), software: Number(row.software_count ?? 0), cves: Number(row.cve_count ?? 0), articles: Number(row.article_count ?? 0) },
    links: { attack: attackGroupUrl(row.attack_id), whatcyber: row.slug ? `${SITE}/threat-actors/${row.slug}` : null },
  };
}

export function serializeActorDetail(row: any, software: any[]) {
  return {
    ...serializeActorItem(row, true),
    software: software.map(s => ({ id: s.attack_id, name: s.name, type: s.software_type, url: `https://attack.mitre.org/software/${s.attack_id}/` })),
  };
}

export const ActorTechniqueSchema = z.object({
  id: z.string().openapi({ example: 'T1566.001' }),
  name: z.string(),
  tactics: z.array(z.string()),
  is_subtechnique: z.boolean(),
  parent_id: z.string().nullable(),
  procedure: z.string().nullable().openapi({ description: 'How ATT&CK says the group uses the technique.' }),
  url: z.string(),
}).openapi('ActorTechnique');

export function serializeActorTechnique(row: any): z.infer<typeof ActorTechniqueSchema> {
  return {
    id: row.attack_id,
    name: row.name,
    tactics: Array.isArray(row.tactics) ? row.tactics : [],
    is_subtechnique: row.is_subtechnique === true,
    parent_id: row.parent_attack_id ?? null,
    procedure: cleanAttackText(row.procedure) || null,
    url: `https://attack.mitre.org/techniques/${String(row.attack_id).replace('.', '/')}/`,
  };
}

export const ActorCveSchema = z.object({
  cve_id: z.string(),
  confidence: z.enum(['high', 'low']).openapi({ description: 'high: ATT&CK names the CVE for this group. low: they appear together in news.' }),
  sources: z.array(z.enum(['attack', 'news'])),
  evidence: z.string().nullable(),
  evidence_url: z.string().nullable(),
  published_at: z.string().datetime().nullable(),
  severity: z.string().nullable(),
  cvss: Cvss.nullable(),
  epss: z.object({ score: z.number(), percentile: z.number().nullable() }).nullable(),
  is_kev: z.boolean(),
}).openapi('ActorCve');

export function serializeActorCve(row: any): z.infer<typeof ActorCveSchema> {
  const known = row.published_date !== null && row.published_date !== undefined;
  const cvss = known ? bestCvss(row) : null;
  return {
    cve_id: row.cve_id,
    confidence: row.confidence,
    sources: [...new Set<'attack' | 'news'>(row.sources ?? [])].sort(),
    evidence: cleanAttackText(row.evidence) || null,
    evidence_url: row.evidence_url ?? null,
    published_at: toIso(row.published_date),
    severity: cvss?.severity ?? null,
    cvss,
    epss: row.epss_score !== null && row.epss_score !== undefined ? { score: toNumber(row.epss_score)!, percentile: toNumber(row.epss_percentile) } : null,
    is_kev: row.is_kev === true,
  };
}
