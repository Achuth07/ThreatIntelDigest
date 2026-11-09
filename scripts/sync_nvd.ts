import * as dotenv from 'dotenv';
import { fetchAndStoreNvdCves, splitNvdWindows } from '../server/services/nvd.js';
import { syncNvdHistory } from '../server/services/nvd-history.js';
import { getNvdSyncState, saveNvdSyncState } from '../server/services/r2.js';

dotenv.config();

const DEFAULT_LOOKBACK_DAYS = 2;
// NVD occasionally returns a short result with a 200. Re-reading recent hours lets later runs fill the gap.
const OVERLAP_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDays(args: string[]): number | null {
  const index = args.indexOf('--days');
  if (index === -1) return null;
  const days = Number(args[index + 1]);
  if (!Number.isInteger(days) || days < 1) {
    throw new Error('--days must be a positive whole number');
  }
  return days;
}

async function main() {
  const args = process.argv.slice(2);
  const days = parseDays(args);
  const historyOnly = args.includes('--history-only');
  const end = new Date();

  const state = await getNvdSyncState();
  const watermark = state
    ? new Date(state.lastSyncedAt).getTime() - OVERLAP_MS
    : end.getTime() - DEFAULT_LOOKBACK_DAYS * DAY_MS;
  // A manual --days run reaches further back, but never leaves a gap after the watermark.
  const start = new Date(days === null ? watermark : Math.min(watermark, end.getTime() - days * DAY_MS));

  console.log(`Syncing NVD changes from ${start.toISOString()} to ${end.toISOString()}`);
  for (const window of splitNvdWindows(start, end)) {
    if (!historyOnly) {
      // CVEs go first: history is only kept for CVEs we store, including brand new ones.
      await fetchAndStoreNvdCves(window.start, window.end, 0, 1000, 'modified');
    }
    await syncNvdHistory(window.start, window.end);
  }

  if (!historyOnly) {
    await saveNvdSyncState({ lastSyncedAt: end.toISOString() });
  }
  console.log('NVD sync complete.');
  process.exit(0);
}

main().catch(error => {
  console.error('NVD sync failed:', error);
  process.exit(1);
});
