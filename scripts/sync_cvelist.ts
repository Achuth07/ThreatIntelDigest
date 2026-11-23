// Updates cve_scores from CVE List records changed since the last run (WHA-53). Reads the
// CVE List's 30-day delta log, fetches each changed record, and keeps CNA CVSS 4.0/3.x and CISA
// SSVC. Runs in the hourly CVE workflow after the NVD sync.
// Usage: npx tsx scripts/sync_cvelist.ts [--hours N]
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { getDb } from '../server/db.js';
import { getCvelistSyncState, saveCvelistSyncState } from '../server/services/r2.js';
import { CVELIST_DELTA_LOG_URL, changedSince, parseCveRecord, upsertCveScores, type CveScoreRow, type DeltaLogEntry } from '../server/services/cvelist.js';

const DEFAULT_LOOKBACK_HOURS = 6;
// The delta log is rewritten every few minutes; re-reading an hour guards against a missed entry.
const OVERLAP_MS = 60 * 60 * 1000;
const CONCURRENCY = 10;

async function fetchJson(url: string, attempts = 3): Promise<any> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return await response.json();
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

async function main() {
  const hoursFlag = process.argv.indexOf('--hours');
  const db = getDb();
  const state = await getCvelistSyncState();
  const since = hoursFlag !== -1
    ? new Date(Date.now() - Number(process.argv[hoursFlag + 1]) * 3600_000)
    : new Date(state ? Date.parse(state.lastFetchTime) - OVERLAP_MS : Date.now() - DEFAULT_LOOKBACK_HOURS * 3600_000);

  const log: DeltaLogEntry[] = await fetchJson(CVELIST_DELTA_LOG_URL);
  if (!Array.isArray(log) || log.length === 0) throw new Error('CVE List delta log is empty or unreadable');
  const newest = log.reduce((max, entry) => (entry.fetchTime > max ? entry.fetchTime : max), log[0].fetchTime);
  const changed = changedSince(log, since);
  console.log(`CVE List: ${changed.size} records changed since ${since.toISOString()}`);

  const rows: CveScoreRow[] = [];
  const nothingToKeep: string[] = [];
  const entries = [...changed];
  let failures = 0;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    await Promise.all(entries.slice(i, i + CONCURRENCY).map(async ([cveId, link]) => {
      try {
        const record = await fetchJson(link);
        const row = record ? parseCveRecord(record) : null;
        if (row) rows.push(row); else nothingToKeep.push(cveId);
      } catch (error) {
        failures++;
        console.error(`Failed to read ${cveId}:`, error);
      }
    }));
  }

  const written = await upsertCveScores(db as any, rows);
  // A record that was rejected or lost its scores should not keep an old row.
  if (nothingToKeep.length) await db.execute(sql`DELETE FROM cve_scores WHERE cve_id IN ${nothingToKeep}`);
  console.log(`cve_scores: ${rows.length} records with scores, ${written} rows written, ${nothingToKeep.length} with nothing to keep`);

  // Too many unreadable records: keep the old position so the next run tries them again.
  if (failures > Math.max(5, entries.length * 0.02)) throw new Error(`${failures} of ${entries.length} records could not be read`);
  await saveCvelistSyncState({ lastFetchTime: newest });
  process.exit(0);
}

main().catch(error => {
  console.error('CVE List sync failed:', error);
  process.exit(1);
});
