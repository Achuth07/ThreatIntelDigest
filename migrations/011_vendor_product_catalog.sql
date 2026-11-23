-- Migration: Vendor and product catalog from CPE names (WHA-51)
-- Date: 2026-11-23
-- Slugs follow CPE 2.3, as OpenCVE does: vendor "apache", product "http_server".
-- Filled by scripts/backfill_catalog.ts and kept current by the NVD sync (server/services/catalog.ts).
--
-- cve_products holds one row per CVE with an array of product ids instead of one row per pair:
-- about 180k rows instead of about 890k, roughly 40 MB instead of 100 MB on a 1 GB plan. The GIN
-- index answers "which CVEs affect product X" (product_ids @> ARRAY[X]).
-- vulnerabilities.vendors (JSONB) stays until its readers move to these tables.

CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  UNIQUE (vendor_id, slug)
);

CREATE TABLE IF NOT EXISTS cve_products (
  cve_id VARCHAR(32) PRIMARY KEY,
  product_ids INTEGER[] NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cve_products_product_ids ON cve_products USING gin (product_ids);

-- CISA KEV names its vendor and product in free text ("Microsoft", "Exchange Server"). This maps each
-- pair to a catalog product. product_id is NULL when nothing matched; those rows are the review list.
-- method: cpe-name (a product on the KEV CVEs whose name matches), cpe-frequency (the product most
-- common across the KEV CVEs, same vendor), name (catalog lookup by name, for CVEs without CPE data).
CREATE TABLE IF NOT EXISTS kev_product_map (
  vendor_project TEXT NOT NULL,
  product TEXT NOT NULL,
  product_id INTEGER REFERENCES products(id),
  method TEXT,
  kev_count INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vendor_project, product)
);
CREATE INDEX IF NOT EXISTS idx_kev_product_map_product ON kev_product_map (product_id);
