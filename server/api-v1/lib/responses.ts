import { z } from '@hono/zod-openapi';
import type { Context } from 'hono';

// Shared v1 response shapes (WHA-39). Every endpoint returns lists, errors and pages this way;
// once published these shapes are hard to change, so new routes must reuse these helpers.

export type ErrorCode =
  | 'invalid_token' | 'insufficient_scope' | 'forbidden' | 'not_found' | 'validation_error'
  | 'rate_limited' | 'quota_exceeded' | 'internal_error' | 'unavailable'
  | 'session_required' | 'key_limit';

// Errors: { error: { code, message, details? }, request_id }. Never a stack trace or SQL.
export function errorBody(c: Context<any>, code: ErrorCode, message: string, details?: Record<string, unknown>) {
  return { error: { code, message, ...(details ? { details } : {}) }, request_id: c.get('requestId') as string };
}

export const ErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.record(z.unknown()).optional() }),
  request_id: z.string(),
}).openapi('Error');

// --- Pagination: ?page=1&page_size=20 ------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
// OFFSET paging gets slower the deeper it goes. Past this many rows, narrow the filters;
// incremental sync with cursors arrives with WHA-67.
export const MAX_OFFSET = 10_000;

// Values above the maximum are an error, not a silent clamp, so callers notice.
export const PageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  page_size: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE).openapi({ example: DEFAULT_PAGE_SIZE }),
});

export interface PageParams { page: number; page_size: number }

export function offsetOf({ page, page_size }: PageParams): number {
  return (page - 1) * page_size;
}

export function pageTooDeep(params: PageParams): boolean {
  return offsetOf(params) + params.page_size > MAX_OFFSET;
}

// The URL the client used, including the public host and scheme behind Vercel's proxy.
export function publicUrl(c: Context<any>): URL {
  const url = new URL(c.req.url);
  const host = c.req.header('x-forwarded-host') || c.req.header('host');
  const proto = c.req.header('x-forwarded-proto');
  if (host) url.host = host;
  if (proto) url.protocol = `${proto.split(',')[0].trim()}:`;
  return url;
}

function pageLink(c: Context<any>, page: number): string {
  const url = publicUrl(c);
  url.searchParams.set('page', String(page));
  return url.toString();
}

// List envelope: { count, next, previous, results }, the same shape as OpenCVE so moving over is
// easy. next and previous are absolute URLs that keep every other query parameter.
// count_estimated is true when count comes from the planner instead of an exact count.
export function listEnvelope<T>(c: Context<any>, params: PageParams, count: number, results: T[], countEstimated = false) {
  const hasNext = offsetOf(params) + results.length < count && results.length === params.page_size && offsetOf(params) + params.page_size < MAX_OFFSET;
  return {
    count,
    ...(countEstimated ? { count_estimated: true } : {}),
    next: hasNext ? pageLink(c, params.page + 1) : null,
    previous: params.page > 1 ? pageLink(c, params.page - 1) : null,
    results,
  };
}

export function listSchema<T extends z.ZodTypeAny>(item: T, name: string) {
  return z.object({
    count: z.number().int(),
    count_estimated: z.boolean().optional().openapi({ description: 'Present and true when count is an estimate.' }),
    next: z.string().url().nullable(),
    previous: z.string().url().nullable(),
    results: z.array(item),
  }).openapi(name);
}

// Turns a zod failure into a validation_error body that names each bad field.
export function validationDetails(issues: z.ZodIssue[]) {
  return { fields: issues.map(issue => ({ field: issue.path.join('.') || 'request', message: issue.message })) };
}

export const toIso = (value: unknown): string | null => (value ? new Date(value as string).toISOString() : null);

// Decimal columns come back from Postgres as strings; the API returns numbers.
export const toNumber = (value: unknown): number | null => (value === null || value === undefined || value === '' ? null : Number(value));
