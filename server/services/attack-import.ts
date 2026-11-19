import { sql, type SQL } from 'drizzle-orm';

// Imports MITRE ATT&CK Enterprise into threat_groups, attack_techniques, attack_software,
// actor_techniques, actor_software and the 'attack' rows of actor_cves (WHA-55).
// See migrations/009_attack_enrichment.sql.

export const ATTACK_BUNDLE_URL = 'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json';

export type AttackStatus = 'active' | 'deprecated' | 'revoked';

export interface ParsedGroup { stixId: string; attackId: string; name: string; description: string; aliases: string[]; modified: Date; status: AttackStatus; revokedBy: string | null }
export interface ParsedTechnique { stixId: string; attackId: string; name: string; description: string; tactics: string[]; platforms: string[]; isSubtechnique: boolean; parentAttackId: string | null; status: AttackStatus; modified: Date }
export interface ParsedSoftware { stixId: string; attackId: string; name: string; type: 'malware' | 'tool'; description: string; aliases: string[]; platforms: string[]; status: AttackStatus; modified: Date }
export interface ParsedLink { groupStixId: string; targetStixId: string; description: string }
export interface ParsedGroupCve { groupStixId: string; cveId: string; evidence: string; evidenceUrl: string; evidenceCount: number }

export interface ParsedAttack {
  version: string | null;
  groups: ParsedGroup[];
  techniques: ParsedTechnique[];
  software: ParsedSoftware[];
  groupTechniques: ParsedLink[];
  groupSoftware: ParsedLink[];
  groupCves: ParsedGroupCve[];
}

const CVE_PATTERN = /CVE-\d{4}-\d{4,7}(?!\d)/gi;

function attackIdOf(object: any): string | null {
  return object.external_references?.find((ref: any) => ref.source_name === 'mitre-attack')?.external_id ?? null;
}

function statusOf(object: any): AttackStatus {
  if (object.revoked) return 'revoked';
  if (object.x_mitre_deprecated) return 'deprecated';
  return 'active';
}

// ATT&CK text carries markdown links and "(Citation: ...)" markers. Keeps the link text.
export function cleanAttackText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\(Citation: [^)]+\)/g, '')
    .replace(/<code>|<\/code>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim();
}

// The sentence around the first mention of cveId, cut to about 300 characters.
function sentenceAround(text: string, cveId: string): string {
  const clean = cleanAttackText(text);
  const at = clean.toUpperCase().indexOf(cveId);
  if (at === -1) return clean.slice(0, 300);
  const previousStop = clean.lastIndexOf('. ', at);
  const start = previousStop === -1 ? 0 : previousStop + 2;
  const endDot = clean.indexOf('. ', at);
  const end = endDot === -1 ? clean.length : endDot + 1;
  const sentence = clean.slice(start, end).trim();
  return sentence.length > 300 ? `${sentence.slice(0, 297)}…` : sentence;
}

export function parseAttackBundle(bundle: { objects: any[] }): ParsedAttack {
  const objects = bundle.objects ?? [];
  const byId = new Map(objects.map(object => [object.id, object]));
  const isActive = (id: string) => { const object = byId.get(id); return !!object && statusOf(object) === 'active'; };

  const revokedBy = new Map<string, string>();
  for (const rel of objects) {
    if (rel.type === 'relationship' && rel.relationship_type === 'revoked-by') {
      const target = byId.get(rel.target_ref);
      const id = target && attackIdOf(target);
      if (id) revokedBy.set(rel.source_ref, id);
    }
  }

  const groups: ParsedGroup[] = [];
  const techniques: ParsedTechnique[] = [];
  const software: ParsedSoftware[] = [];
  for (const object of objects) {
    const attackId = attackIdOf(object);
    if (!attackId) continue;
    const status = statusOf(object);
    const modified = new Date(object.modified);
    if (object.type === 'intrusion-set') {
      const aliases = [...new Set<string>(object.aliases ?? object.x_mitre_aliases ?? [])].filter(alias => alias !== object.name);
      groups.push({ stixId: object.id, attackId, name: object.name, description: object.description ?? '', aliases, modified, status, revokedBy: revokedBy.get(object.id) ?? null });
    } else if (object.type === 'attack-pattern') {
      const isSubtechnique = !!object.x_mitre_is_subtechnique;
      techniques.push({
        stixId: object.id, attackId, name: object.name, description: object.description ?? '',
        tactics: (object.kill_chain_phases ?? []).filter((phase: any) => phase.kill_chain_name === 'mitre-attack').map((phase: any) => phase.phase_name),
        platforms: object.x_mitre_platforms ?? [], isSubtechnique, parentAttackId: isSubtechnique ? attackId.split('.')[0] : null, status, modified,
      });
    } else if (object.type === 'malware' || object.type === 'tool') {
      software.push({
        stixId: object.id, attackId, name: object.name, type: object.type, description: object.description ?? '',
        aliases: (object.x_mitre_aliases ?? []).filter((alias: string) => alias !== object.name), platforms: object.x_mitre_platforms ?? [], status, modified,
      });
    }
  }

  const groupTechniques: ParsedLink[] = [];
  const groupSoftware: ParsedLink[] = [];
  // groupStixId -> cveId -> evidence
  const cves = new Map<string, Map<string, { evidence: string; count: number }>>();
  const addCves = (groupStixId: string, text: string | undefined) => {
    if (!text) return;
    const found = new Set((text.match(CVE_PATTERN) ?? []).map(id => id.toUpperCase()));
    for (const cveId of found) {
      const forGroup = cves.get(groupStixId) ?? cves.set(groupStixId, new Map()).get(groupStixId)!;
      const existing = forGroup.get(cveId);
      if (existing) existing.count++;
      else forGroup.set(cveId, { evidence: sentenceAround(text, cveId), count: 1 });
    }
  };

  // Campaigns attributed to a group count as that group's activity.
  const campaignGroups = new Map<string, string[]>();
  for (const rel of objects) {
    if (rel.type !== 'relationship' || statusOf(rel) !== 'active') continue;
    if (rel.relationship_type === 'attributed-to' && byId.get(rel.source_ref)?.type === 'campaign' && byId.get(rel.target_ref)?.type === 'intrusion-set' && isActive(rel.target_ref)) {
      campaignGroups.set(rel.source_ref, [...(campaignGroups.get(rel.source_ref) ?? []), rel.target_ref]);
    }
  }
  for (const [campaignId, groupIds] of campaignGroups) {
    const campaign = byId.get(campaignId);
    if (campaign && statusOf(campaign) === 'active') for (const groupId of groupIds) addCves(groupId, campaign.description);
  }

  for (const rel of objects) {
    if (rel.type !== 'relationship' || rel.relationship_type !== 'uses' || statusOf(rel) !== 'active') continue;
    if (!isActive(rel.source_ref) || !isActive(rel.target_ref)) continue;
    const source = byId.get(rel.source_ref);
    const target = byId.get(rel.target_ref);
    const groupIds = source.type === 'intrusion-set' ? [source.id] : source.type === 'campaign' ? campaignGroups.get(source.id) ?? [] : [];
    for (const groupId of groupIds) addCves(groupId, rel.description);
    if (source.type !== 'intrusion-set') continue;
    const link = { groupStixId: source.id, targetStixId: target.id, description: rel.description ?? '' };
    if (target.type === 'attack-pattern') groupTechniques.push(link);
    else if (target.type === 'malware' || target.type === 'tool') groupSoftware.push(link);
  }

  const groupAttackIds = new Map(groups.map(group => [group.stixId, group.attackId]));
  const groupCves: ParsedGroupCve[] = [];
  for (const [groupStixId, forGroup] of cves) {
    for (const [cveId, { evidence, count }] of forGroup) {
      groupCves.push({ groupStixId, cveId, evidence, evidenceUrl: `https://attack.mitre.org/groups/${groupAttackIds.get(groupStixId)}/`, evidenceCount: count });
    }
  }

  const collection = objects.find(object => object.type === 'x-mitre-collection');
  return { version: collection?.x_mitre_version ?? null, groups, techniques, software, groupTechniques, groupSoftware, groupCves };
}

interface Executor { execute(query: SQL): Promise<{ rows: any[] }> }
interface Database extends Executor { transaction<T>(run: (tx: Executor) => Promise<T>): Promise<T> }

async function insertInChunks<T>(tx: Executor, rows: T[], size: number, build: (chunk: T[]) => SQL) {
  for (let i = 0; i < rows.length; i += size) await tx.execute(build(rows.slice(i, i + size)));
}

export interface ImportSummary {
  version: string | null;
  groupsInserted: number;
  groupsUpdated: number;
  groupsMarkedInactive: number;
  techniques: number;
  software: number;
  actorTechniques: number;
  actorSoftware: number;
  actorCves: number;
}

// Writes everything in one transaction, so a failed run leaves the previous data in place.
// Active groups are inserted or updated. Deprecated or revoked ones only update existing rows.
// Links are replaced for every group in the bundle; groups outside it keep theirs.
export async function importAttack(db: Database, parsed: ParsedAttack): Promise<ImportSummary> {
  return db.transaction(async tx => {
    const summary: ImportSummary = { version: parsed.version, groupsInserted: 0, groupsUpdated: 0, groupsMarkedInactive: 0, techniques: parsed.techniques.length, software: parsed.software.length, actorTechniques: 0, actorSoftware: 0, actorCves: 0 };

    await insertInChunks(tx, parsed.techniques, 200, chunk => sql`
      INSERT INTO attack_techniques (stix_id, attack_id, name, description, tactics, platforms, is_subtechnique, parent_attack_id, status, modified)
      VALUES ${sql.join(chunk.map(t => sql`(${t.stixId}, ${t.attackId}, ${t.name}, ${t.description}, ${JSON.stringify(t.tactics)}::jsonb, ${JSON.stringify(t.platforms)}::jsonb, ${t.isSubtechnique}, ${t.parentAttackId}, ${t.status}, ${t.modified})`), sql`, `)}
      ON CONFLICT (stix_id) DO UPDATE SET attack_id = EXCLUDED.attack_id, name = EXCLUDED.name, description = EXCLUDED.description, tactics = EXCLUDED.tactics,
        platforms = EXCLUDED.platforms, is_subtechnique = EXCLUDED.is_subtechnique, parent_attack_id = EXCLUDED.parent_attack_id, status = EXCLUDED.status, modified = EXCLUDED.modified
    `);
    await insertInChunks(tx, parsed.software, 200, chunk => sql`
      INSERT INTO attack_software (stix_id, attack_id, name, software_type, description, aliases, platforms, status, modified)
      VALUES ${sql.join(chunk.map(s => sql`(${s.stixId}, ${s.attackId}, ${s.name}, ${s.type}, ${s.description}, ${JSON.stringify(s.aliases)}::jsonb, ${JSON.stringify(s.platforms)}::jsonb, ${s.status}, ${s.modified})`), sql`, `)}
      ON CONFLICT (stix_id) DO UPDATE SET attack_id = EXCLUDED.attack_id, name = EXCLUDED.name, software_type = EXCLUDED.software_type, description = EXCLUDED.description,
        aliases = EXCLUDED.aliases, platforms = EXCLUDED.platforms, status = EXCLUDED.status, modified = EXCLUDED.modified
    `);

    // Inactive groups first: a revoked group can hand its ATT&CK ID's neighbour nothing, but clearing
    // statuses before the active upsert keeps the unique attack_id index from ever seeing a clash.
    const inactive = parsed.groups.filter(group => group.status !== 'active');
    await insertInChunks(tx, inactive, 200, chunk => sql`
      UPDATE threat_groups AS g SET attack_id = d.attack_id, attack_status = d.status, revoked_by = d.revoked_by, last_updated = d.modified::timestamp
      FROM (VALUES ${sql.join(chunk.map(group => sql`(${group.stixId}, ${group.attackId}, ${group.status}, ${group.revokedBy}, ${group.modified})`), sql`, `)})
        AS d(stix_id, attack_id, status, revoked_by, modified)
      WHERE g.stix_id = d.stix_id
    `);
    if (inactive.length) {
      const { rows } = await tx.execute(sql`SELECT count(*)::int AS n FROM threat_groups WHERE stix_id IN ${inactive.map(group => group.stixId)}`);
      summary.groupsMarkedInactive = rows[0].n;
    }

    const active = parsed.groups.filter(group => group.status === 'active');
    for (let i = 0; i < active.length; i += 100) {
      const { rows } = await tx.execute(sql`
        INSERT INTO threat_groups (stix_id, name, description, aliases, last_updated, attack_id, attack_status, revoked_by)
        VALUES ${sql.join(active.slice(i, i + 100).map(group => sql`(${group.stixId}, ${group.name}, ${group.description}, ${JSON.stringify(group.aliases)}::jsonb, ${group.modified}, ${group.attackId}, 'active', NULL)`), sql`, `)}
        ON CONFLICT (stix_id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, aliases = EXCLUDED.aliases,
          last_updated = EXCLUDED.last_updated, attack_id = EXCLUDED.attack_id, attack_status = 'active', revoked_by = NULL
        RETURNING (xmax = 0) AS inserted
      `);
      for (const row of rows) { if (row.inserted) summary.groupsInserted++; else summary.groupsUpdated++; }
    }

    const { rows: idRows } = await tx.execute(sql`SELECT id, stix_id FROM threat_groups WHERE stix_id IN ${parsed.groups.map(group => group.stixId)}`);
    const groupIds = new Map<string, string>(idRows.map(row => [row.stix_id, row.id]));
    const inBundle = [...groupIds.values()];

    if (inBundle.length) {
      await tx.execute(sql`DELETE FROM actor_techniques WHERE threat_group_id IN ${inBundle}`);
      await tx.execute(sql`DELETE FROM actor_software WHERE threat_group_id IN ${inBundle}`);
      await tx.execute(sql`DELETE FROM actor_cves WHERE source = 'attack' AND threat_group_id IN ${inBundle}`);
    }

    const techniqueLinks = parsed.groupTechniques.filter(link => groupIds.has(link.groupStixId));
    await insertInChunks(tx, techniqueLinks, 500, chunk => sql`
      INSERT INTO actor_techniques (threat_group_id, technique_stix_id, description)
      VALUES ${sql.join(chunk.map(link => sql`(${groupIds.get(link.groupStixId)}::uuid, ${link.targetStixId}, ${link.description})`), sql`, `)}
      ON CONFLICT DO NOTHING
    `);
    const softwareLinks = parsed.groupSoftware.filter(link => groupIds.has(link.groupStixId));
    await insertInChunks(tx, softwareLinks, 500, chunk => sql`
      INSERT INTO actor_software (threat_group_id, software_stix_id, description)
      VALUES ${sql.join(chunk.map(link => sql`(${groupIds.get(link.groupStixId)}::uuid, ${link.targetStixId}, ${link.description})`), sql`, `)}
      ON CONFLICT DO NOTHING
    `);
    const cveLinks = parsed.groupCves.filter(link => groupIds.has(link.groupStixId));
    await insertInChunks(tx, cveLinks, 500, chunk => sql`
      INSERT INTO actor_cves (threat_group_id, cve_id, source, confidence, evidence, evidence_url, evidence_count)
      VALUES ${sql.join(chunk.map(link => sql`(${groupIds.get(link.groupStixId)}::uuid, ${link.cveId}, 'attack', 'high', ${link.evidence}, ${link.evidenceUrl}, ${link.evidenceCount})`), sql`, `)}
    `);

    summary.actorTechniques = techniqueLinks.length;
    summary.actorSoftware = softwareLinks.length;
    summary.actorCves = cveLinks.length;
    return summary;
  });
}
