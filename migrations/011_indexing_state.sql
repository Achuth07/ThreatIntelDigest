-- Migration: control switch and log for the CVE tier 2 rollout
-- Date: 2026-11-23
-- Description: WHA-23. Additive; the current site keeps working before and after it runs.
--   * indexing_state: one row per setting. 'cve_tier2' holds {"days": N}, the window of CVE publish dates
--     that is listed in the sitemap and sent to IndexNow. No row, or days 0, means tier 2 is off (the
--     default). Change it with: npx tsx scripts/set-cve-tier2.ts --days 90   (or --off)
--   * cve_indexnow_log: the CVEs already sent to IndexNow, so each is sent once.

CREATE TABLE IF NOT EXISTS indexing_state (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cve_indexnow_log (
  cve_id       VARCHAR(32) PRIMARY KEY,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
