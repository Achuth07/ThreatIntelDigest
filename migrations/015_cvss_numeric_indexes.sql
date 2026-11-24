-- Migration: Order CVSS scores as numbers (WHA-57)
-- Date: 2026-11-24
-- vulnerabilities.cvss_v3_score and cvss_v2_score are stored as text, so the "most relevant" sort
-- (and its index from migration 008) ordered them alphabetically: "9.9" came before "10", which put
-- all 1,388 CVEs scored 10 below every 9.x CVE. These indexes order the same values as numbers.
-- Built CONCURRENTLY so the hourly sync keeps writing; run one statement at a time.

-- CVE list "most relevant" sort, now numeric (api/index.ts uses this exact expression).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vulnerabilities_relevance_numeric ON vulnerabilities ((COALESCE(cvss_v3_score::numeric, cvss_v2_score::numeric)) DESC NULLS LAST, last_modified_date DESC, published_date DESC);

-- v1 GET /cves?sort=-cvss: CVEs with an NVD 3.x score, highest first.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vulnerabilities_cvss_v3_numeric ON vulnerabilities ((cvss_v3_score::numeric) DESC, published_date DESC) WHERE cvss_v3_score IS NOT NULL;

-- The text-ordered index it replaces.
DROP INDEX CONCURRENTLY IF EXISTS idx_vulnerabilities_relevance;

ANALYZE vulnerabilities;
