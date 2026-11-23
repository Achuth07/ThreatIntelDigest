-- Migration: Index recent CVE change events for alerts and sync (WHA-56)
-- Date: 2026-11-23
-- One narrow row per NVD change event (and per large EPSS move), kept for 90 days so
-- "what changed since X" is one indexed query. Old and new values stay in R2 (cve-history/).
-- NVD logs about 1,800 events a day, so 90 days is about 160k rows.

CREATE TABLE IF NOT EXISTS cve_change_events (
  -- NVD cveChangeId, or "epss-<date>-<CVE>" for EPSS moves, matching the R2 history id.
  id TEXT PRIMARY KEY,
  cve_id VARCHAR(32) NOT NULL,
  event_name TEXT NOT NULL,
  -- NVD detail types as given, e.g. {"CVSS V3.1", "Reference"}.
  types TEXT[] NOT NULL DEFAULT '{}',
  -- Simplified for alerts: new_cve, cvss, description, references, weaknesses, products,
  -- ssvc, kev_added, kev_updated, rejected, epss_jump.
  change_types TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL
);

-- Keyset paging: WHERE (created_at, id) > ($since, $lastId) ORDER BY created_at, id.
CREATE INDEX IF NOT EXISTS idx_cve_change_events_created ON cve_change_events (created_at, id);
CREATE INDEX IF NOT EXISTS idx_cve_change_events_cve ON cve_change_events (cve_id);
