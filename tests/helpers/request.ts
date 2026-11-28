import { createHmac } from 'node:crypto';
import { app } from '../../server/api-v1/app.js';
import { createKey, type Scope } from '../../server/api-v1/api-keys.js';
import { getDb } from '../../server/db.js';
import { ADMIN } from './seed.js';

// Calls the v1 app in-process with app.request(). Each request gets its own source IP unless one
// is given, so the per-IP limit only matters in the tests that are about it.

let ipCounter = 0;

export interface CallOptions {
  method?: string;
  key?: string;
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
  ip?: string;
}

export async function call(path: string, options: CallOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { 'x-real-ip': options.ip ?? `198.51.100.${(++ipCounter % 250) + 1}`, ...options.headers };
  if (options.key) headers['x-api-key'] = options.key;
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  return app.request(path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : typeof options.body === 'string' ? options.body : JSON.stringify(options.body),
  });
}

const b64 = (value: string) => Buffer.from(value).toString('base64').replace(/=/g, '');

// A site session token in the format api/index.ts issues, signed with the test secret.
export function sessionToken(claims: Record<string, unknown> = {}): string {
  const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64(JSON.stringify({ userId: ADMIN.id, email: ADMIN.email, isAdmin: true, exp: Math.floor(Date.now() / 1000) + 3600, ...claims }));
  const signature = createHmac('sha256', process.env.SESSION_SECRET!).update(`${header}.${payload}`).digest('base64').replace(/=/g, '');
  return `${header}.${payload}.${signature}`;
}

export async function apiKey(scopes: Scope[] = ['catalog:read'], userId = ADMIN.id): Promise<string> {
  const { key } = await createKey(getDb() as any, userId, { name: 'test', scopes });
  return key;
}
