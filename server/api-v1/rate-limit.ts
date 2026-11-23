import { createHmac } from 'node:crypto';
import { sql, type SQL } from 'drizzle-orm';

// Fixed-window rate limiting for the v1 API, counted in Postgres so every serverless instance
// shares the same numbers. See migrations/013_api_rate_limits.sql.

export interface Limit { name: string; max: number; windowSeconds: number }

// Strict while the API is admin-only. Every request counts against its IP first, including
// requests that then fail auth, so token guessing is slowed too.
export const IP_LIMITS: Limit[] = [{ name: 'ip-minute', max: 30, windowSeconds: 60 }];
export const ADMIN_LIMITS: Limit[] = [
  { name: 'admin-minute', max: 60, windowSeconds: 60 },
  { name: 'admin-day', max: 1000, windowSeconds: 86_400 },
];

export interface LimitResult {
  limit: Limit;
  hits: number;
  remaining: number;
  resetSeconds: number;
  exceeded: boolean;
}

interface Executor { execute(query: SQL): Promise<{ rows: any[] }> }

// IPs are kept as a keyed hash so the table never holds raw addresses.
export function hashIp(ip: string): string {
  const key = process.env.SESSION_SECRET || 'rate-limit';
  return createHmac('sha256', key).update(ip).digest('hex').slice(0, 32);
}

const windowStart = (now: number, windowSeconds: number) => Math.floor(now / 1000 / windowSeconds) * windowSeconds;

// Counts one hit in every limit for `subject` and reports where each stands. One round trip.
export async function hit(db: Executor, subject: string, limits: Limit[], now = Date.now()): Promise<LimitResult[]> {
  const rows = limits.map(limit => ({ limit, bucket: `${limit.name}:${subject}`, start: windowStart(now, limit.windowSeconds) }));
  const { rows: counts } = await db.execute(sql`
    INSERT INTO api_rate_limits (bucket, window_start)
    VALUES ${sql.join(rows.map(r => sql`(${r.bucket}, to_timestamp(${r.start}))`), sql`, `)}
    ON CONFLICT (bucket, window_start) DO UPDATE SET hits = api_rate_limits.hits + 1
    RETURNING bucket, hits
  `);
  const hitsByBucket = new Map(counts.map(row => [row.bucket as string, Number(row.hits)]));
  return rows.map(({ limit, bucket, start }) => {
    const hits = hitsByBucket.get(bucket) ?? 1;
    return {
      limit,
      hits,
      remaining: Math.max(0, limit.max - hits),
      resetSeconds: Math.max(1, start + limit.windowSeconds - Math.floor(now / 1000)),
      exceeded: hits > limit.max,
    };
  });
}

// Deletes windows that ended more than a day ago. Called on a small share of requests.
export async function pruneOldWindows(db: Executor): Promise<void> {
  await db.execute(sql`DELETE FROM api_rate_limits WHERE window_start < now() - interval '2 days'`);
}

// The tightest limit decides the headers: the one with the fewest requests left.
export function rateLimitHeaders(results: LimitResult[]): Record<string, string> {
  const tightest = [...results].sort((a, b) => a.remaining - b.remaining || b.resetSeconds - a.resetSeconds)[0];
  const headers: Record<string, string> = {
    'RateLimit-Policy': results.map(r => `${r.limit.max};w=${r.limit.windowSeconds}`).join(', '),
    'RateLimit-Limit': String(tightest.limit.max),
    'RateLimit-Remaining': String(tightest.remaining),
    'RateLimit-Reset': String(tightest.resetSeconds),
  };
  const blocked = results.filter(r => r.exceeded);
  if (blocked.length) headers['Retry-After'] = String(Math.max(...blocked.map(r => r.resetSeconds)));
  return headers;
}
