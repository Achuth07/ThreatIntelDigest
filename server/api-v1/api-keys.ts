import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { sql, type SQL } from 'drizzle-orm';

// API keys (WHA-42). Format: wc_live_<key_id>.<secret>. The fixed prefix lets secret scanners
// spot leaked keys. Only a SHA-256 hash of the secret is stored; the secret has 256 bits of
// entropy, so a slow hash such as bcrypt would add latency to every request for no benefit.
// Never log a full key: log key_id only.

export const KEY_PREFIX = 'wc_live_';
export const MAX_ACTIVE_KEYS = 5;
export const READ_SCOPES = ['catalog:read', 'kev:read', 'actors:read', 'news:read', 'stats:read'] as const;
export type Scope = (typeof READ_SCOPES)[number];

const KEY_ID_ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const KEY_PATTERN = /^wc_live_([A-Za-z0-9]{16})\.([A-Za-z0-9_-]{43})$/;

interface Executor { execute(query: SQL): Promise<{ rows: any[] }> }

export interface ApiKeySummary {
  id: string;
  keyId: string;
  name: string;
  scopes: Scope[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export interface KeyOwner { keyId: string; userId: number; email: string; scopes: Scope[] }

function randomKeyId(): string {
  const bytes = randomBytes(16);
  return Array.from(bytes, b => KEY_ID_ALPHABET[b % KEY_ID_ALPHABET.length]).join('');
}

export const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');

export function generateKey(): { key: string; keyId: string; secretHash: string } {
  const keyId = randomKeyId();
  const secret = randomBytes(32).toString('base64url'); // 256 bits, 43 characters
  return { key: `${KEY_PREFIX}${keyId}.${secret}`, keyId, secretHash: hashSecret(secret) };
}

export function parseKey(value: string): { keyId: string; secret: string } | null {
  const match = KEY_PATTERN.exec(value.trim());
  return match ? { keyId: match[1], secret: match[2] } : null;
}

export const looksLikeApiKey = (value: string) => value.trim().startsWith(KEY_PREFIX);

const toSummary = (row: any): ApiKeySummary => ({
  id: row.id,
  keyId: row.key_id,
  name: row.name,
  scopes: row.scopes ?? [],
  createdAt: new Date(row.created_at).toISOString(),
  lastUsedAt: row.last_used_at ? new Date(row.last_used_at).toISOString() : null,
  expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
});

export class KeyLimitError extends Error {}

// Creates a key and returns it once, in full. Only the summary can be read back later.
export async function createKey(db: Executor, userId: number, input: { name: string; scopes?: Scope[]; expiresInDays?: number | null }): Promise<{ key: string; summary: ApiKeySummary }> {
  const { rows: active } = await db.execute(sql`
    SELECT count(*)::int AS n FROM api_keys
    WHERE user_id = ${userId} AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())
  `);
  if (active[0].n >= MAX_ACTIVE_KEYS) throw new KeyLimitError(`You can have at most ${MAX_ACTIVE_KEYS} active keys. Revoke one first.`);

  const scopes = input.scopes?.length ? [...new Set(input.scopes)] : [...READ_SCOPES];
  const { key, keyId, secretHash } = generateKey();
  const { rows } = await db.execute(sql`
    INSERT INTO api_keys (key_id, secret_hash, user_id, name, scopes, expires_at)
    VALUES (${keyId}, ${secretHash}, ${userId}, ${input.name.trim()}, ${JSON.stringify(scopes)}::jsonb,
            ${input.expiresInDays ? sql`now() + make_interval(days => ${input.expiresInDays})` : sql`NULL`})
    RETURNING id, key_id, name, scopes, created_at, last_used_at, expires_at
  `);
  return { key, summary: toSummary(rows[0]) };
}

export async function listKeys(db: Executor, userId: number): Promise<ApiKeySummary[]> {
  const { rows } = await db.execute(sql`
    SELECT id, key_id, name, scopes, created_at, last_used_at, expires_at FROM api_keys
    WHERE user_id = ${userId} AND revoked_at IS NULL
    ORDER BY created_at DESC
  `);
  return rows.map(toSummary);
}

// Revoking is permanent. Returns false when the key is not this user's or is already revoked.
export async function revokeKey(db: Executor, userId: number, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const { rows } = await db.execute(sql`
    UPDATE api_keys SET revoked_at = now() WHERE id = ${id}::uuid AND user_id = ${userId} AND revoked_at IS NULL RETURNING id
  `);
  return rows.length === 1;
}

// Finds the owner of an active key, or null. Compares hashes in constant time.
export async function lookupKey(db: Executor, value: string): Promise<KeyOwner | null> {
  const parsed = parseKey(value);
  if (!parsed) return null;
  const { rows } = await db.execute(sql`
    SELECT k.key_id, k.secret_hash, k.user_id, k.scopes, u.email, (k.last_used_at IS NULL OR k.last_used_at < now() - interval '5 minutes') AS stale
    FROM api_keys k JOIN users u ON u.id = k.user_id
    WHERE k.key_id = ${parsed.keyId} AND k.revoked_at IS NULL AND (k.expires_at IS NULL OR k.expires_at > now())
  `);
  const row = rows[0];
  if (!row) return null;
  const expected = Buffer.from(row.secret_hash, 'hex');
  const actual = Buffer.from(hashSecret(parsed.secret), 'hex');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  // Recording use costs a write, so it is done at most every 5 minutes per key.
  if (row.stale) db.execute(sql`UPDATE api_keys SET last_used_at = now() WHERE key_id = ${row.key_id}`).catch(() => {});
  return { keyId: row.key_id, userId: row.user_id, email: row.email, scopes: row.scopes ?? [] };
}
