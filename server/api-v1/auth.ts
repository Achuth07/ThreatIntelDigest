import { createHmac, timingSafeEqual } from 'node:crypto';
import { sql, type SQL } from 'drizzle-orm';

// Admin-only access for the v1 API while it is not public (API keys arrive with WHA-42 to WHA-46).
// Accepts the site's session token (Authorization: Bearer <token>) when it belongs to the admin.
// Unlike the older handlers, nothing here falls back to a default secret or a default admin
// email: if SESSION_SECRET or ADMIN_EMAIL is missing, every request is refused.

export interface AdminIdentity { userId: number; email: string }

export type AuthResult =
  | { ok: true; admin: AdminIdentity }
  | { ok: false; status: 401 | 403 | 503; code: string; message: string };

interface Executor { execute(query: SQL): Promise<{ rows: any[] }> }

function base64UrlToBuffer(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

// Same token format as generateToken in api/index.ts: HS256 over "header.payload", base64 without padding.
export function verifySessionToken(token: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): any | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64').replace(/=/g, '');
  const a = Buffer.from(expected), b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const decodedHeader = JSON.parse(base64UrlToBuffer(header).toString());
    if (decodedHeader.alg !== 'HS256') return null;
    const claims = JSON.parse(base64UrlToBuffer(payload).toString());
    if (typeof claims.exp !== 'number' || nowSeconds > claims.exp) return null;
    if (typeof claims.iat === 'number' && claims.iat > nowSeconds + 60) return null;
    return claims;
  } catch {
    return null;
  }
}

// A deleted or renamed admin account loses access within a minute even if its token is still valid.
const ACCOUNT_CACHE_MS = 60_000;
const accountCache = new Map<string, { ok: boolean; at: number }>();

export async function authenticateAdmin(db: Executor, authorization: string | undefined): Promise<AuthResult> {
  const secret = process.env.SESSION_SECRET;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!secret || !adminEmail) {
    return { ok: false, status: 503, code: 'auth_unavailable', message: 'The API is not accepting requests right now.' };
  }
  if (!authorization?.startsWith('Bearer ')) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Send an admin token as "Authorization: Bearer <token>". The API is admin-only for now.' };
  }
  const claims = verifySessionToken(authorization.slice(7).trim(), secret);
  if (!claims) {
    return { ok: false, status: 401, code: 'invalid_token', message: 'The token is invalid or has expired.' };
  }
  const email = String(claims.email ?? '').trim().toLowerCase();
  const userId = Number(claims.userId);
  if (claims.isAdmin !== true || email !== adminEmail || !Number.isInteger(userId)) {
    return { ok: false, status: 403, code: 'forbidden', message: 'The API is admin-only for now.' };
  }

  const key = `${userId}:${email}`;
  const cached = accountCache.get(key);
  let exists = cached && Date.now() - cached.at < ACCOUNT_CACHE_MS ? cached.ok : null;
  if (exists === null) {
    const { rows } = await db.execute(sql`SELECT 1 FROM users WHERE id = ${userId} AND lower(email) = ${email} LIMIT 1`);
    exists = rows.length === 1;
    accountCache.set(key, { ok: exists, at: Date.now() });
  }
  if (!exists) return { ok: false, status: 403, code: 'forbidden', message: 'The API is admin-only for now.' };
  return { ok: true, admin: { userId, email } };
}
