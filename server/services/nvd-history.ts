import type { CveChangeEvent } from '../../shared/cve-history.js';
import { fetchNvdJson, getStoredLastModified } from './nvd.js';
import { getCveHistory, saveCveHistory } from './r2.js';

const HISTORY_PAGE_SIZE = 5000;
const R2_BATCH_SIZE = 20;
// NVD logs a machine translation of every new description, which is noise in a timeline.
const IGNORED_EVENTS = new Set(['CVE Translated']);

export function toChangeEvent(change: any): CveChangeEvent {
  const created: string = change.created;
  return {
    id: change.cveChangeId,
    eventName: change.eventName,
    source: change.sourceIdentifier,
    createdAt: /(Z|[+-]\d{2}:\d{2})$/.test(created) ? created : `${created}Z`,
    details: change.details ?? [],
  };
}

// Newest first. `added` is 0 when every incoming event is already stored.
export function mergeChangeEvents(
  existing: CveChangeEvent[],
  incoming: CveChangeEvent[]
): { merged: CveChangeEvent[]; added: number } {
  const byId = new Map(existing.map(event => [event.id, event]));
  for (const event of incoming) {
    byId.set(event.id, event);
  }
  const merged = Array.from(byId.values()).sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
  );
  return { merged, added: merged.length - existing.length };
}

async function fetchChangesByCve(start: Date, end: Date): Promise<Map<string, CveChangeEvent[]>> {
  const byCve = new Map<string, CveChangeEvent[]>();
  const range = `changeStartDate=${start.toISOString()}&changeEndDate=${end.toISOString()}`;
  let startIndex = 0;
  let totalResults = 0;

  do {
    const data = await fetchNvdJson(
      `https://services.nvd.nist.gov/rest/json/cvehistory/2.0?${range}&resultsPerPage=${HISTORY_PAGE_SIZE}&startIndex=${startIndex}`
    );
    totalResults = data.totalResults ?? 0;
    for (const { change } of data.cveChanges ?? []) {
      if (IGNORED_EVENTS.has(change.eventName)) continue;
      const events = byCve.get(change.cveId) ?? [];
      events.push(toChangeEvent(change));
      byCve.set(change.cveId, events);
    }
    startIndex += HISTORY_PAGE_SIZE;
    if (startIndex < totalResults) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } while (startIndex < totalResults);

  return byCve;
}

export async function syncNvdHistory(start: Date, end: Date): Promise<void> {
  const byCve = await fetchChangesByCve(start, end);
  const stored = await getStoredLastModified(Array.from(byCve.keys()));
  const cveIds = Array.from(byCve.keys()).filter(cveId => stored.has(cveId));
  let failures = 0;
  let written = 0;

  for (let i = 0; i < cveIds.length; i += R2_BATCH_SIZE) {
    const results = await Promise.allSettled(
      cveIds.slice(i, i + R2_BATCH_SIZE).map(async cveId => {
        const { merged, added } = mergeChangeEvents(await getCveHistory(cveId), byCve.get(cveId)!);
        if (added > 0) {
          await saveCveHistory(cveId, merged);
          written++;
        }
      })
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        failures++;
        console.error('[NVD History] Failed to update history:', result.reason);
      }
    }
  }

  console.log(`[NVD History] ${cveIds.length} CVEs had changes, ${written} history files updated`);
  if (failures > 0) {
    throw new Error(`${failures} CVE history file(s) failed to update`);
  }
}
