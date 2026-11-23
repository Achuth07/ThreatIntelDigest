-- Migration: product pages and "most affected vendors" on CWE pages
-- Date: 2026-11-23
-- Description: WHA-24, second part. Additive; the current site keeps working before and after it runs.
--   * product_stats: the products that get a page, /vendors/<vendor>/<product>. Product names come from the
--     CISA KEV catalog (NVD product lists live in R2, not the database), and only products with at least
--     5 KEV entries qualify. Refreshed daily with vendor_stats and cwe_stats.
--   * cwe_stats.top_vendors: the vendors with the most CVEs for each weakness, computed in the same refresh
--     (one grouped scan, about 3 s) so a CWE page does not unnest vendors on every request.
--   Fill both afterwards with: npx tsx scripts/refresh-hub-stats.ts

CREATE TABLE IF NOT EXISTS product_stats (
  vendor_slug  TEXT NOT NULL,              -- the vendor hub slug when there is one, e.g. "paloaltonetworks"
  product_slug TEXT NOT NULL,              -- e.g. "pan-os"
  vendor_name  TEXT NOT NULL,              -- as CISA writes it, e.g. "Palo Alto Networks"
  product_name TEXT NOT NULL,              -- as CISA writes it, e.g. "PAN-OS"
  kev_count    INTEGER NOT NULL,
  rank         INTEGER NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vendor_slug, product_slug)
);
CREATE INDEX IF NOT EXISTS idx_product_stats_rank ON product_stats (rank);

ALTER TABLE cwe_stats ADD COLUMN IF NOT EXISTS top_vendors JSONB NOT NULL DEFAULT '[]'::jsonb;
