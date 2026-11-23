import { sql, type SQL } from 'drizzle-orm';

// CVSS 4.0, CNA CVSS 3.x and CISA SSVC from CVE List records (WHA-53).
// See migrations/012_cve_scores.sql. Records follow CVE JSON 5.x.

export const CVELIST_DELTA_LOG_URL = 'https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/deltaLog.json';

export interface CveScoreRow {
  cveId: string;
  cvss4: { score: number; severity: string | null; vector: string | null; source: 'cna' | 'adp' } | null;
  cvss3: { score: number; severity: string | null; vector: string | null; source: 'cna' | 'adp' } | null;
  ssvc: { exploitation: string | null; automatable: string | null; technicalImpact: string | null; timestamp: string | null } | null;
  recordUpdated: string | null;
}

function firstMetric(containers: any[], key: string) {
  for (const container of containers) {
    for (const metric of container?.metrics ?? []) {
      const data = metric?.[key];
      if (data && typeof data.baseScore === 'number') return { score: data.baseScore, severity: data.baseSeverity ?? null, vector: data.vectorString ?? null };
    }
  }
  return null;
}

// Source priority per the issue: the CNA's own score, then CISA's (Vulnrichment). NVD's view stays
// in vulnerabilities.cvss_v3_*. Returns null for rejected records and records with nothing to add.
export function parseCveRecord(record: any): CveScoreRow | null {
  const meta = record?.cveMetadata;
  if (!meta?.cveId || meta.state !== 'PUBLISHED') return null;
  const cna = record.containers?.cna;
  const cisa = (record.containers?.adp ?? []).find((adp: any) => adp?.providerMetadata?.shortName === 'CISA-ADP');

  const pick = (key: string) => {
    const fromCna = firstMetric(cna ? [cna] : [], key);
    if (fromCna) return { ...fromCna, source: 'cna' as const };
    const fromAdp = firstMetric(cisa ? [cisa] : [], key);
    return fromAdp ? { ...fromAdp, source: 'adp' as const } : null;
  };
  const cvss4 = pick('cvssV4_0');
  const cvss3 = pick('cvssV3_1') ?? pick('cvssV3_0');

  let ssvc: CveScoreRow['ssvc'] = null;
  for (const metric of cisa?.metrics ?? []) {
    if (metric?.other?.type !== 'ssvc') continue;
    const content = metric.other.content ?? {};
    const option = (name: string) => {
      const found = (content.options ?? []).find((o: any) => o && name in o);
      return found ? String(found[name]).toLowerCase() : null;
    };
    ssvc = { exploitation: option('Exploitation'), automatable: option('Automatable'), technicalImpact: option('Technical Impact'), timestamp: content.timestamp ?? null };
  }

  if (!cvss4 && !cvss3 && !ssvc) return null;
  return { cveId: meta.cveId.toUpperCase(), cvss4, cvss3, ssvc, recordUpdated: meta.dateUpdated ?? null };
}

interface Executor { execute(query: SQL): Promise<{ rows: any[] }> }

const tz = (value: string | null) => (value ? (/(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`) : null);

// Inserts or updates rows; a row is only rewritten when the record is newer than what is stored.
export async function upsertCveScores(db: Executor, rows: CveScoreRow[]): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000);
    const { rows: out } = await db.execute(sql`
      INSERT INTO cve_scores (cve_id, cvss4_score, cvss4_severity, cvss4_vector, cvss4_source, cvss3_score, cvss3_severity, cvss3_vector, cvss3_source,
                              ssvc_exploitation, ssvc_automatable, ssvc_technical_impact, ssvc_timestamp, record_updated)
      VALUES ${sql.join(chunk.map(r => sql`(${r.cveId}, ${r.cvss4?.score ?? null}, ${r.cvss4?.severity ?? null}, ${r.cvss4?.vector ?? null}, ${r.cvss4?.source ?? null},
        ${r.cvss3?.score ?? null}, ${r.cvss3?.severity ?? null}, ${r.cvss3?.vector ?? null}, ${r.cvss3?.source ?? null},
        ${r.ssvc?.exploitation ?? null}, ${r.ssvc?.automatable ?? null}, ${r.ssvc?.technicalImpact ?? null}, ${tz(r.ssvc?.timestamp ?? null)}::timestamptz, ${tz(r.recordUpdated)}::timestamptz)`), sql`, `)}
      ON CONFLICT (cve_id) DO UPDATE SET
        cvss4_score = EXCLUDED.cvss4_score, cvss4_severity = EXCLUDED.cvss4_severity, cvss4_vector = EXCLUDED.cvss4_vector, cvss4_source = EXCLUDED.cvss4_source,
        cvss3_score = EXCLUDED.cvss3_score, cvss3_severity = EXCLUDED.cvss3_severity, cvss3_vector = EXCLUDED.cvss3_vector, cvss3_source = EXCLUDED.cvss3_source,
        ssvc_exploitation = EXCLUDED.ssvc_exploitation, ssvc_automatable = EXCLUDED.ssvc_automatable, ssvc_technical_impact = EXCLUDED.ssvc_technical_impact,
        ssvc_timestamp = EXCLUDED.ssvc_timestamp, record_updated = EXCLUDED.record_updated, updated_at = now()
      WHERE cve_scores.record_updated IS NULL OR EXCLUDED.record_updated > cve_scores.record_updated
      RETURNING cve_id
    `);
    written += out.length;
  }
  return written;
}

export interface DeltaLogEntry { fetchTime: string; new?: { cveId: string; githubLink: string; dateUpdated?: string }[]; updated?: { cveId: string; githubLink: string; dateUpdated?: string }[] }

// Records changed after `since`, newest link per CVE, from the CVE List's 30-day delta log.
export function changedSince(log: DeltaLogEntry[], since: Date): Map<string, string> {
  const links = new Map<string, { link: string; at: number }>();
  for (const entry of log) {
    const at = Date.parse(entry.fetchTime);
    if (!(at > since.getTime())) continue;
    for (const change of [...(entry.new ?? []), ...(entry.updated ?? [])]) {
      const existing = links.get(change.cveId);
      if (!existing || at > existing.at) links.set(change.cveId, { link: change.githubLink, at });
    }
  }
  return new Map([...links].map(([cveId, { link }]) => [cveId, link]));
}
