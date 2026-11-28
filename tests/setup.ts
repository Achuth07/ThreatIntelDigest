import { vi } from 'vitest';

// Runs before every test file. Nothing in a test may reach production: the Neon URL and R2
// credentials are removed, so any code path that tries to use them fails loudly instead.
delete process.env.DATABASE_URL;
for (const key of Object.keys(process.env)) if (key.startsWith('R2_') || key.startsWith('CLOUDFLARE_')) delete process.env[key];

process.env.SESSION_SECRET = 'test-session-secret';
process.env.ADMIN_EMAIL = 'admin@test.local';

// R2 is replaced by an in-memory store the tests fill (tests/helpers/r2.ts).
vi.mock('../server/services/r2.js', async () => (await import('./helpers/r2.js')).fakeR2Module);
