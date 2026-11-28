/**
 * The threat actor profile template (WHA-20): the facts every profile shows, built from the actor's
 * MITRE ATT&CK data, and the written profile for the actors that have one. The page, the API and the
 * server-rendered copy all use this, so they cannot drift apart.
 * Keep this file free of React and browser APIs, the server uses it too.
 */

import { ACTOR_PROFILES, type ActorProfile } from './actor-profiles.js';

// ATT&CK v20 matrix order. Tactics not listed here sort after these.
export const TACTICS: [string, string][] = [
  ['reconnaissance', 'Reconnaissance'], ['resource-development', 'Resource Development'], ['initial-access', 'Initial Access'],
  ['execution', 'Execution'], ['persistence', 'Persistence'], ['privilege-escalation', 'Privilege Escalation'],
  ['stealth', 'Stealth'], ['defense-impairment', 'Defense Impairment'], ['defense-evasion', 'Defense Evasion'],
  ['credential-access', 'Credential Access'], ['discovery', 'Discovery'], ['lateral-movement', 'Lateral Movement'],
  ['collection', 'Collection'], ['command-and-control', 'Command and Control'], ['exfiltration', 'Exfiltration'], ['impact', 'Impact'],
];

export const tacticName = (id: string): string => TACTICS.find(([key]) => key === id)?.[1] ?? id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const tacticRank = (id: string): number => {
  const i = TACTICS.findIndex(([key]) => key === id);
  return i === -1 ? TACTICS.length : i;
};

export interface ActorFacts {
  name: string;
  attackId: string | null;
  aliases: string[];
  techniques: { attackId: string; name: string; tactics: string[]; isSubtechnique: boolean }[];
  software: { name: string; type: string }[];
  cves: { cveId: string; confidence: string; inKev: boolean }[];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const list = (items: string[]) => (items.length <= 2 ? items.join(' and ') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

/** Tactic ids by how many of the actor's techniques use them, most first. */
export function topTactics(facts: ActorFacts, limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const technique of facts.techniques) for (const tactic of technique.tactics) counts.set(tactic, (counts.get(tactic) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || tacticRank(a[0]) - tacticRank(b[0]))
    .slice(0, limit)
    .map(([tactic]) => tactic);
}

/** Distinct tactic ids across all techniques. */
const tacticCount = (facts: ActorFacts) => new Set(facts.techniques.flatMap((t) => t.tactics)).size;

/**
 * "At a glance" text, written from the actor's data so it is specific to the actor and not a copy of
 * MITRE's description. Returns '' when there is nothing recorded to say.
 */
export function factsSummary(facts: ActorFacts): string {
  const parts: string[] = [];
  const topLevel = facts.techniques.filter((t) => !t.isSubtechnique).length;
  if (facts.techniques.length > 0) {
    const tactics = topTactics(facts).map((t) => tacticName(t).toLowerCase());
    // "N of them top-level" only says something when there is a mix of techniques and sub-techniques.
    const mix = topLevel > 0 && topLevel < facts.techniques.length ? ` (${topLevel} of them top-level)` : '';
    parts.push(
      `MITRE ATT&CK${facts.attackId ? ` (${facts.attackId})` : ''} records ${plural(facts.techniques.length, 'technique')} for ${facts.name}` +
        `${mix} across ${plural(tacticCount(facts), 'tactic')}, most often ${list(tactics)}.`,
    );
  }
  if (facts.software.length > 0) {
    const names = facts.software.slice(0, 4).map((s) => s.name);
    const more = facts.software.length > names.length ? `, and ${facts.software.length - names.length} more` : '';
    parts.push(`It is linked to ${plural(facts.software.length, 'malware family or tool', 'malware families and tools')}, including ${list(names)}${more}.`);
  }
  if (facts.cves.length > 0) {
    const kev = facts.cves.filter((c) => c.inKev).length;
    const confirmed = facts.cves.filter((c) => c.confidence === 'high').length;
    const tail = kev === facts.cves.length ? `all in the CISA KEV catalog` : kev > 0 ? `${kev} of them in the CISA KEV catalog` : 'none of them in the CISA KEV catalog';
    parts.push(`${plural(facts.cves.length, 'vulnerability', 'vulnerabilities')} ${facts.cves.length === 1 ? 'is' : 'are'} tied to it (${confirmed} reported by MITRE), ${tail}.`);
  }
  return parts.join(' ');
}

/**
 * The written profile for an actor, or null. A profile is shown only once a person has reviewed it
 * (`reviewedOn`). `includeDrafts` lets local development and Vercel previews show unreviewed ones, so they
 * can be read in place; the server decides that, the browser never does.
 */
export function publishedProfile(slug: string | null | undefined, includeDrafts: boolean): (ActorProfile & { draft: boolean }) | null {
  if (!slug) return null;
  const profile = ACTOR_PROFILES[slug];
  if (!profile) return null;
  if (!profile.reviewedOn && !includeDrafts) return null;
  return { ...profile, draft: !profile.reviewedOn };
}

/** Drafts show everywhere except production. */
export function showDrafts(vercelEnv: string | undefined): boolean {
  return vercelEnv !== 'production';
}

/**
 * A short line for the directory: the first sentences of the written profile, or of the data-built summary,
 * cut at a sentence end that fits `maxLength` (or at a word, with an ellipsis, if the first sentence is longer).
 * Returns '' when there is neither, so the caller can fall back to another text.
 */
export function actorSnippet(profile: ActorProfile | null, facts: ActorFacts, maxLength = 220): string {
  const text = (profile?.summary || factsLine(facts)).trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  // Split after sentence-ending punctuation followed by a space, so names such as "TEMP.Veles" stay whole.
  const sentences = text.split(/(?<=[.!?])\s+/);
  let out = '';
  for (const sentence of sentences) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > maxLength) break;
    out = next;
  }
  if (out) return out;
  const cut = text.slice(0, maxLength - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1)).replace(/[,;:]$/, '')}…`;
}

/**
 * One compact line of counts for lists, written from the actor's data: techniques (with the tactics used
 * most), malware and tools, and linked vulnerabilities. '' when nothing is recorded.
 */
export function factsLine(facts: ActorFacts): string {
  const parts: string[] = [];
  if (facts.techniques.length > 0) {
    const tactics = topTactics(facts).map((t) => tacticName(t).toLowerCase());
    parts.push(`${plural(facts.techniques.length, 'ATT&CK technique')} (most often ${list(tactics)})`);
  }
  if (facts.software.length > 0) parts.push(plural(facts.software.length, 'malware family or tool', 'malware families and tools'));
  if (facts.cves.length > 0) {
    const kev = facts.cves.filter((c) => c.inKev).length;
    parts.push(`${plural(facts.cves.length, 'linked vulnerability', 'linked vulnerabilities')}${kev > 0 ? `, ${kev} in the CISA KEV catalog` : ''}`);
  }
  return parts.length ? `${parts.join('; ')}.` : '';
}

/** Meta description for an actor: the written summary when there is one, then the data summary. */
export function profileDescription(profile: ActorProfile | null, facts: ActorFacts, mitreDescription: string | null | undefined): string {
  const text = profile?.summary || factsSummary(facts) || mitreDescription || '';
  return text;
}
