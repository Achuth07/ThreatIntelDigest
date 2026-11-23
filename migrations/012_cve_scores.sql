-- Migration: CVSS 4.0, CNA scores and SSVC from the CVE List (WHA-53)
-- Date: 2026-11-23
-- Source: CVEProject/cvelistV5. Each record's "cna" container holds the CNA's own scores, and
-- the "CISA-ADP" container holds CISA Vulnrichment (SSVC, and CVSS where the CNA gave none).
-- A separate narrow table instead of new columns on vulnerabilities, which would rewrite all
-- 276k rows on a 1 GB plan. vulnerabilities.cvss_v3_* stays NVD's view; this table adds the
-- other sources, and *_source says which one supplied each score: 'cna' or 'adp'.
-- Filled by scripts/backfill_cvelist.ts and kept current by scripts/sync_cvelist.ts.

CREATE TABLE IF NOT EXISTS cve_scores (
  cve_id VARCHAR(32) PRIMARY KEY,
  cvss4_score NUMERIC(3, 1),
  cvss4_severity TEXT,
  cvss4_vector TEXT,
  cvss4_source TEXT,
  cvss3_score NUMERIC(3, 1),
  cvss3_severity TEXT,
  cvss3_vector TEXT,
  cvss3_source TEXT,
  -- CISA SSVC decision points: exploitation none/poc/active, automatable yes/no, technical impact partial/total.
  ssvc_exploitation TEXT,
  ssvc_automatable TEXT,
  ssvc_technical_impact TEXT,
  ssvc_timestamp TIMESTAMPTZ,
  record_updated TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cve_scores_ssvc_exploitation ON cve_scores (ssvc_exploitation) WHERE ssvc_exploitation IS NOT NULL;
