import { gunzipSync } from 'zlib';
import { sql } from 'drizzle-orm';
import type { CveChangeEvent } from '../../shared/cve-history.js';
import { getDb } from '../db.js';
import { mergeChangeEvents } from './nvd-history.js';
import { getCveHistory, getEpssSyncState, saveCveHistory, saveEpssSyncState } from './r2.js';

// FIRST's stable link to the latest daily file. It redirects to the dated file.
const EPSS_CURRENT_URL = 'https://epss.empiricalsecurity.com/epss_scores-current.csv.gz';
// The full file lists about 400,000 CVEs. Far fewer means a broken download.
const MIN_EXPECTED_ROWS = 200_000;
// Percentiles drift slightly every day as new CVEs arrive. Rewriting a row only when its
// percentile moves this much keeps daily writes to a few thousand rows instead of ~250,000.
const PERCENTILE_TOLERANCE = 0.005;
// A score move this large is recorded in the CVE's history timeline (about 6 CVEs a day).
const JUMP_THRESHOLD = 0.1;
const UPDATE_BATCH_SIZE = 1000;
const R2_BATCH_SIZE = 20;

export interface EpssScore {
  score: number;
  percentile: number;
}

export interface EpssFile {
  modelVersion: string;
  scoreDate: string;
  scores: Map<string, EpssScore>;
}

export interface StoredEpss {
  id: string;
  score: number | null;
  percentile: number | null;
}

export interface EpssJump {
  cveId: string;
  oldScore: number;
  newScore: number;
}

export function parseEpssCsv(text: string): EpssFile {
  const lines = text.split('\n');
  const meta = Object.fromEntries(
    lines[0].replace(/^#/, '').split(',').map(part => part.split(':').map(s => s.trim()) as [string, string])
  );
  // The score date contains colons, so rebuild it from the raw header.
  const scoreDate = lines[0].match(/score_date:([^,\s]+)/)?.[1];
  if (!meta.model_version || !scoreDate || lines[1]?.trim() !== 'cve,epss,percentile') {
    throw new Error(`Unexpected EPSS file header: ${lines.slice(0, 2).join(' | ').slice(0, 200)}`);
  }

  const scores = new Map<string, EpssScore>();
  for (let i = 2; i < lines.length; i++) {
    const [cve, epss, percentile] = lines[i].split(',');
    if (!cve) continue;
    const score = Number(epss);
    const rank = Number(percentile);
    if (!/^CVE-\d{4}-\d+$/.test(cve) || !(score >= 0 && score <= 1) || !(rank >= 0 && rank <= 1)) {
      throw new Error(`Unexpected EPSS row ${i + 1}: ${lines[i].slice(0, 100)}`);
    }
    scores.set(cve, { score, percentile: rank });
  }
  if (scores.size < MIN_EXPECTED_ROWS) {
    throw new Error(`EPSS file has only ${scores.size} rows; expected at least ${MIN_EXPECTED_ROWS}`);
  }
  return { modelVersion: meta.model_version, scoreDate, scores };
}

export async function downloadEpssFile(): Promise<EpssFile> {
  const response = await fetch(EPSS_CURRENT_URL, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) {
    throw new Error(`EPSS download failed: ${response.status} ${response.statusText}`);
  }
  return parseEpssCsv(gunzipSync(Buffer.from(await response.arrayBuffer())).toString('utf8'));
}

// Decides which stored CVEs need a write and which moved enough to note in their history.
export function planEpssUpdates(
  stored: StoredEpss[],
  scores: Map<string, EpssScore>,
  options: { recordJumps: boolean }
): { updates: { id: string; score: number; percentile: number }[]; jumps: EpssJump[] } {
  const updates: { id: string; score: number; percentile: number }[] = [];
  const jumps: EpssJump[] = [];
  for (const row of stored) {
    const next = scores.get(row.id);
    if (!next) continue;
    const scoreChanged = row.score === null || row.score.toFixed(5) !== next.score.toFixed(5);
    const percentileDrifted = row.percentile === null || Math.abs(row.percentile - next.percentile) >= PERCENTILE_TOLERANCE;
    if (scoreChanged || percentileDrifted) {
      updates.push({ id: row.id, ...next });
    }
    if (options.recordJumps && row.score !== null && Math.abs(next.score - row.score) >= JUMP_THRESHOLD) {
      jumps.push({ cveId: row.id, oldScore: row.score, newScore: next.score });
    }
  }
  return { updates, jumps };
}

const asPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

export function toEpssEvent(jump: EpssJump, scoreDate: string): CveChangeEvent {
  return {
    id: `epss-${scoreDate.slice(0, 10)}-${jump.cveId}`,
    eventName: jump.newScore > jump.oldScore ? 'EPSS Score Increased' : 'EPSS Score Decreased',
    source: 'FIRST EPSS',
    createdAt: scoreDate,
    details: [{ action: 'Changed', type: 'EPSS', oldValue: asPercent(jump.oldScore), newValue: asPercent(jump.newScore) }],
  };
}

async function loadStoredEpss(): Promise<StoredEpss[]> {
  const result = await getDb().execute(sql`SELECT id, epss_score, epss_percentile FROM vulnerabilities`);
  return (result.rows as { id: string; epss_score: string | null; epss_percentile: string | null }[]).map(row => ({
    id: row.id,
    score: row.epss_score === null ? null : Number(row.epss_score),
    percentile: row.epss_percentile === null ? null : Number(row.epss_percentile),
  }));
}

async function recordJumps(jumps: EpssJump[], scoreDate: string): Promise<void> {
  for (let i = 0; i < jumps.length; i += R2_BATCH_SIZE) {
    await Promise.all(
      jumps.slice(i, i + R2_BATCH_SIZE).map(async jump => {
        const { merged, added } = mergeChangeEvents(await getCveHistory(jump.cveId), [toEpssEvent(jump, scoreDate)]);
        if (added > 0) await saveCveHistory(jump.cveId, merged);
      })
    );
  }
}

async function writeScores(updates: { id: string; score: number; percentile: number }[]): Promise<void> {
  const db = getDb();
  for (let i = 0; i < updates.length; i += UPDATE_BATCH_SIZE) {
    const values = sql.join(
      updates.slice(i, i + UPDATE_BATCH_SIZE).map(u => sql`(${u.id}, ${u.score.toFixed(5)}, ${u.percentile.toFixed(5)})`),
      sql`, `
    );
    await db.execute(sql`
      UPDATE vulnerabilities AS v
      SET epss_score = d.score::numeric, epss_percentile = d.percentile::numeric
      FROM (VALUES ${values}) AS d(id, score, percentile)
      WHERE v.id = d.id
    `);
  }
}

export async function ingestEpss(options: { force?: boolean } = {}): Promise<void> {
  const file = await downloadEpssFile();
  const state = await getEpssSyncState();
  console.log(`[EPSS] ${file.scores.size} scores for ${file.scoreDate} (model ${file.modelVersion})`);

  if (!options.force && state?.scoreDate === file.scoreDate) {
    console.log('[EPSS] Already loaded this file. Nothing to do.');
    return;
  }

  // A new EPSS model reshuffles most scores at once, which says nothing about a single CVE.
  const recordJumpsForRun = state !== null && state.modelVersion === file.modelVersion;
  const { updates, jumps } = planEpssUpdates(await loadStoredEpss(), file.scores, { recordJumps: recordJumpsForRun });
  console.log(`[EPSS] ${updates.length} rows to update, ${jumps.length} large moves to record`);

  // History first: if a later step fails, a re-run still sees the old scores and finds the same moves.
  await recordJumps(jumps, file.scoreDate);
  await writeScores(updates);
  await saveEpssSyncState({ scoreDate: file.scoreDate, modelVersion: file.modelVersion });
  console.log('[EPSS] Done.');
}
