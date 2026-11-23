-- Migration: Rate-limit counters for the v1 API (WHA-43, first part)
-- Date: 2026-11-23
-- Fixed-window counters shared by every serverless instance. One row per bucket and window,
-- e.g. ('ip:<hash>', 2026-11-23 08:01:00, 12). Old windows are deleted by the API itself.
-- IP addresses are stored only as a keyed hash.

CREATE TABLE IF NOT EXISTS api_rate_limits (
  bucket TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket, window_start)
);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON api_rate_limits (window_start);
