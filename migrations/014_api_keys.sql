-- Migration: API keys (WHA-42)
-- Date: 2026-11-23
-- Keys look like wc_live_<key_id>.<secret>. key_id is the public half used to find the row;
-- only a SHA-256 hash of the 256-bit secret is stored, so the table holds nothing recoverable.
-- organization_id is reserved for team accounts later.

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id TEXT NOT NULL UNIQUE,
  secret_hash TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID,
  name TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id);
