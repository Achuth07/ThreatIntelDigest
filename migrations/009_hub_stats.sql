-- Migration: hub stats for vendor and CWE pages
-- Date: 2026-11-20
-- Description: WHA-24. Ranking every vendor or CWE scans the whole vulnerabilities table (1.5 to 2.7 s),
--              so the top 100 vendors and top 50 CWEs are computed once a day and stored here. The pages
--              read these tables to know which hubs exist and in what order. Additive: the current site
--              keeps working before and after it runs.
--              Fill the tables afterwards with: npx tsx scripts/refresh-hub-stats.ts

CREATE TABLE IF NOT EXISTS vendor_stats (
  slug         TEXT PRIMARY KEY,           -- public address, e.g. "palo-alto-networks"
  vendor       TEXT NOT NULL,              -- the value stored in vulnerabilities.vendors, e.g. "palo_alto_networks"
  display_name TEXT NOT NULL,              -- e.g. "Palo Alto Networks"
  cve_count    INTEGER NOT NULL,
  kev_count    INTEGER NOT NULL DEFAULT 0,
  rank         INTEGER NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendor_stats_rank ON vendor_stats (rank);

CREATE TABLE IF NOT EXISTS cwe_stats (
  id         TEXT PRIMARY KEY,             -- e.g. "CWE-79"
  cve_count  INTEGER NOT NULL,
  kev_count  INTEGER NOT NULL DEFAULT 0,
  rank       INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cwe_stats_rank ON cwe_stats (rank);

-- CWE pages list the CVEs with a given weakness; without an index that is a full scan (about 0.4 s).
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_weaknesses ON vulnerabilities USING gin (weaknesses);
