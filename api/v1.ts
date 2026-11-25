// Vercel function for the public v1 API (WHA-38). The app itself is in server/api-v1/app.ts.
// vercel.json sends api.whatcyber.com/* and /api/v1/* here.
//
// This bridges Vercel's Node request to the Hono app by hand instead of using
// @hono/node-server/vercel. Vercel adds helpers to every Node function (req.body, req.query), and
// they can read the request stream first; the adapter then waited for a body that never came, so
// every POST timed out with a 504. The helpers stay on because api/index.ts relies on them.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from '../server/api-v1/app.js';

type VercelIncoming = IncomingMessage & { body?: unknown; rawBody?: unknown };

// The request body, taken from Vercel's helper when it has one and from the stream otherwise.
export async function readBody(req: VercelIncoming): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;

  let parsed: unknown;
  try {
    parsed = req.body; // A getter under Vercel's helpers; it throws on malformed JSON.
  } catch {
    parsed = undefined;
  }
  if (parsed !== undefined && parsed !== null) {
    if (Buffer.isBuffer(parsed)) return parsed;
    if (typeof parsed === 'string') return Buffer.from(parsed);
    return Buffer.from(JSON.stringify(parsed));
  }

  // Already consumed by someone else: there is nothing left to read, so do not wait for it.
  if (req.readableEnded) return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

export async function toRequest(req: VercelIncoming): Promise<Request> {
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host ?? 'localhost';
  const proto = ((req.headers['x-forwarded-proto'] as string | undefined) ?? 'https').split(',')[0].trim();
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    // The body may be re-serialised, so its original length no longer applies.
    if (value === undefined || key === 'content-length' || key === 'transfer-encoding') continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  const body = await readBody(req);
  return new Request(`${proto}://${host}${req.url ?? '/'}`, { method: req.method, headers, body: body?.length ? body : undefined });
}

export default async function handler(req: VercelIncoming, res: ServerResponse) {
  const response = await app.fetch(await toRequest(req));
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.appendHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}
