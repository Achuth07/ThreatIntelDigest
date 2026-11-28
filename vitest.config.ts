import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Tests for the v1 API (WHA-40). They run in-process: Hono's app.request() with an in-memory
// Postgres (PGlite) and a fake R2, so no server, network or Neon connection is needed.
export default defineConfig({
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'shared') },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    // Starting PGlite and loading the schema takes a couple of seconds per file.
    hookTimeout: 30_000,
    testTimeout: 15_000,
  },
});
