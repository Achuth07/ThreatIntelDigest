import { MAX_EXPOSURE_ROWS, parseStack, type ExposureEntry } from '../../client/src/lib/exposure.js';
import type { IStorage } from '../storage.js';

/** The two KEV exposure checker endpoints (WHA-29), shared by the Express app and the Vercel function. */

export const EXPOSURE_CACHE = 'public, s-maxage=900, stale-while-revalidate=3600';

export async function kevCatalogResponse(storage: IStorage) {
  return { vendors: await storage.getKevCatalog() };
}

/** `item` is `Vendor` or `Vendor|Product`, once or repeated. */
export async function kevExposureResponse(
  storage: IStorage,
  rawItems: unknown,
): Promise<{ status: 200; body: { items: ReturnType<typeof parseStack>; entries: ExposureEntry[]; truncated: boolean } } | { status: 400; body: { error: string } }> {
  const values = (Array.isArray(rawItems) ? rawItems : rawItems == null ? [] : [rawItems]).filter((v): v is string => typeof v === 'string');
  const items = parseStack(values);
  if (items.length === 0) return { status: 400, body: { error: 'Give at least one item=Vendor or item=Vendor|Product.' } };
  const entries = await storage.getKevExposure(items, MAX_EXPOSURE_ROWS + 1);
  const truncated = entries.length > MAX_EXPOSURE_ROWS;
  return { status: 200, body: { items, entries: truncated ? entries.slice(0, MAX_EXPOSURE_ROWS) : entries, truncated } };
}
