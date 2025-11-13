## AI Coding Agent Guide for ThreatIntelDigest

Purpose: Enable immediate productive contributions while preserving established architecture and patterns. Keep changes lean, follow existing abstractions, and prefer extension over reinvention.

### Core Architecture
Backend runs Express (`server/index.ts`) with a single consolidated API surface. All REST paths `/api/*` are ultimately funneled through the action‐based router in `api/index.ts` via adapter wrappers in `server/routes.ts` (mock Vercel request/response). Do NOT bolt on ad‑hoc standalone route logic; instead extend the appropriate handler section (e.g. add a new block under the pathname checks in `api/index.ts`).

Storage is abstracted by `IStorage` (`server/storage.ts`) with interchangeable `MemStorage` (ephemeral) and `PostgresStorage` (`server/postgres-storage.ts`) selected dynamically by presence of `DATABASE_URL`. When adding persistence features, add methods to `IStorage` plus both implementations.

### Consolidated API specifics
- Router entry: `api/index.ts` branches by `pathname.startsWith('/api/...')` and uses an `action` query param for sub-operations. Each domain has a dedicated handler block (e.g., `handleSourcesEndpoints`, `handleArticlesEndpoints`, `handleBookmarksEndpoints`, `handleVulnerabilitiesEndpoints`, `handleFetchFeedsEndpoints`).
- Express adapter: `server/routes.ts` exposes thin `app.get/post/patch/delete('/api/...')` shims that build mock Vercel request/response via `createMockHandlers` and immediately call the consolidated handler. Never place business logic in these shims.
- Adding an endpoint: (1) add a new pathname branch + handler in `api/index.ts`, (2) add matching Express passthrough route(s) in `server/routes.ts` that forward to the same `/api/...` path. Use `action` for operations instead of many new paths when practical.
- Auth token utils live in `api/index.ts` (`generateToken`, `verifyToken`, `getUserIdFromRequest`); the client stores tokens in `localStorage` (`client/src/lib/auth.ts`). Reuse these—don’t roll your own.

### Data & Validation
Relational schema + types live in `shared/schema.ts` using Drizzle + `createInsertSchema` (Drizzle-Zod). New tables: follow pattern (pgTable + createInsertSchema + exported types). Soft delete / deactivate uses `isActive` flags (e.g. `rssSources`). Avoid hard deletes unless clearly required; mirror existing `deleteRssSource` behavior.

Articles, bookmarks, sources, vulnerabilities, users, preferences follow insert/select type naming: `InsertX` vs `X`. Reuse these types in new code—don’t duplicate structural interfaces.

### Auth & Sessions
Google OAuth handled by Passport (`server/auth/google-auth.ts`) and consolidated endpoints (`/api/auth`, `/api/auth/google`, `/api/auth/status`, `/api/auth/logout`). Session middleware set before routes; tokens for client side stored in localStorage (`client/src/lib/auth.ts`) with simple JWT helpers in `api/index.ts`. If enhancing auth, keep token generation in one place (extend `generateToken` / `verifyToken`).

### Frontend Patterns
React + Vite (client). Data fetches use `apiRequest` and React Query invalidation (see `sidebar.tsx` mutations: refresh feeds, fetch CVEs, toggle source). New UI components should follow shadcn/ui conventions (in `client/src/components/ui/`) and keep side-effectful mutations wrapped in `useMutation` with toast feedback.

### Workflows & Scripts
Dev: `npm run dev` (starts Express + Vite integration). Build: `npm run build` bundles frontend (Vite) and backend (esbuild). Prod start: `npm start`. Migrations/schema push: `npm run db:push` (drizzle-kit). Deployment validation: `npm run validate-deployment`. Bookmark maintenance: `scripts/check-orphaned-bookmarks.ts`, `cleanup-orphaned-bookmarks.ts`—follow these if adding data hygiene tasks.

### Logging & Performance
API logging truncates long JSON bodies (`server/index.ts` middleware). Preserve this pattern—avoid verbose per-item logs in high-volume handlers (feeds/CVEs). Batch operations (feed & CVE refresh) should continue returning concise status objects, not raw arrays unless paginated.

### Data Flow Summary
RSS fetch (`/api/fetch-feeds`) -> normalize -> store as `articles` -> user bookmarks reference `articleId`. CVE fetch (`/api/fetch-cves`) -> populate `vulnerabilities`. User source preferences modify filtering (active sources only). Keep transformations server-side; the client expects already curated lists.

### Vercel deployment nuances
- Single-function mindset: Keep all API logic in `api/index.ts` to minimize serverless function count (fits Vercel Hobby limits). Don’t add new files under `api/` for endpoints—extend the consolidated handler.
- Env detection: `VERCEL_ENV` (preferred) and `NODE_ENV` drive auth callback URLs in `api/index.ts` and `server/auth/google-auth.ts`. Production assumes `https://threatfeed.whatcyber.com`; dev uses `http://localhost:5001` (backend) and `http://localhost:5173` (frontend).
- DB on Vercel: Uses Neon serverless via Drizzle; connections are created lazily with dynamic imports in `api/index.ts` (`drizzle-orm/neon-serverless`, `@neondatabase/serverless`) to avoid cold-start bloat.
- Validate before deploy: run `npm run validate-deployment`. Ensure required env vars are set on Vercel: `DATABASE_URL`, `NVD_API_KEY`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAIL` (optional), and any CounterAPI token `VITE_THREATFEED_COUNTER`.
- Response size & logging: Keep responses compact and avoid logging large payloads—important for serverless execution time and log quotas.

### Adding Features Safely (Examples)
1. New endpoint (e.g. tag analytics): add pathname branch in `api/index.ts`; extend `IStorage`; implement in both storages; expose via existing adapter (no new Express route file required).
2. New table: define in `shared/schema.ts`, export insert schema & types, then reference through storage layer.
3. Frontend view: create component under `components/`, fetch via React Query, invalidate affected query keys on mutation.

### Conventions & Gotchas
- Prefer soft deactivation (`isActive`) over deletion for user-modifiable entities.
- Avoid duplicating JWT logic; always use the existing helper functions.
- Keep environment conditional logic consistent (NODE_ENV / VERCEL_ENV checks already in auth + callback code).
- Large responses: consider pagination parameters matching existing patterns (`limit`, `offset`, `search`, `sortBy`).
- Do not bypass `createMockHandlers` in `server/routes.ts`; consistency is key for future serverless portability.

### Security & Secrets Management
**CRITICAL: Never expose API keys, tokens, or secrets in code, documentation, or commit messages.**
- **NEVER** copy API keys, tokens, passwords, or secrets from `.env` files to any documentation, markdown files, code comments, or implementation guides
- **NEVER** include actual API keys in example code or configuration files that will be committed to Git
- Always use placeholder text like `your_api_key_here`, `your_secret_here`, or `***REDACTED***` in documentation
- If accidentally committed, immediately remove from current files, commit the fix, and notify the user to rotate/regenerate the exposed credentials
- Environment variables in `.env` files should NEVER be copied verbatim—always reference them generically
- When documenting environment setup, only show the variable names and placeholder values, never actual secrets

### When Unsure
Search for an existing pattern first (e.g. bookmark create flow) and mirror structure. Keep new code TypeScript strict using existing types. Ask for clarification if a change would introduce a second persistence path or a divergent auth scheme.

Provide diffs only; avoid wholesale rewrites of stable files. Keep PRs scoped by feature.

Feedback requested: Are additional test/run instructions, feed parsing internals, or deployment nuances (Vercel limits) needed? Specify gaps to iterate.
