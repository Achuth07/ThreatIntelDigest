-- Migration: Add EPSS score and percentile to vulnerabilities (WHA-52)
-- Date: 2026-11-13
-- Both columns are nullable, so code without EPSS support keeps working after this runs.

ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS epss_score NUMERIC(6, 5);
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS epss_percentile NUMERIC(6, 5);

CREATE INDEX IF NOT EXISTS idx_vulnerabilities_epss_score ON vulnerabilities (epss_score DESC NULLS LAST);
