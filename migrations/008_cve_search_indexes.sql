-- Migration: Index CVE search and list sorting (WHA-50)
-- Date: 2026-11-19
-- No table rewrite: descriptions already live in search_vector, and list excerpts are cut from it
-- in server/services/cve-text.ts. Each index is built CONCURRENTLY so the hourly NVD sync keeps
-- writing; run the statements one at a time, outside a transaction.
-- Estimated size on 274k CVEs: full-text 101 MB, list sorts 19 MB, ID prefix about 10 MB (1 GB plan).

-- Full-text search. Queries must use exactly this expression to hit the index.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vulnerabilities_fts ON vulnerabilities USING gin (to_tsvector('english', COALESCE(search_vector, '')));

-- CVE list "newest" sort.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vulnerabilities_published ON vulnerabilities (published_date DESC, last_modified_date DESC);

-- CVE list "most relevant" sort.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vulnerabilities_relevance ON vulnerabilities ((COALESCE(cvss_v3_score, cvss_v2_score)) DESC NULLS LAST, last_modified_date DESC, published_date DESC);

-- Prefix lookups on CVE IDs typed into search ("CVE-2024-34").
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vulnerabilities_id_pattern ON vulnerabilities (id varchar_pattern_ops);

ANALYZE vulnerabilities;
