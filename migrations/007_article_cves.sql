-- Migration: Link news articles to the CVEs they mention (WHA-54)
-- Date: 2026-11-19
-- Each link keeps its own copy of the article's title, URL, source and date, because
-- feed ingest deletes articles after 30 days and the CVE's news coverage should outlive that.
-- article_id is cleared, not cascaded, when the article row is deleted.
-- cve_id has no foreign key: news often names a CVE before NVD publishes it.

CREATE TABLE IF NOT EXISTS article_cves (
  cve_id VARCHAR(32) NOT NULL,
  article_url TEXT NOT NULL,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  published_at TIMESTAMP NOT NULL,
  found_in TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (cve_id, article_url)
);

CREATE INDEX IF NOT EXISTS idx_article_cves_cve_published ON article_cves (cve_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_cves_article_id ON article_cves (article_id);
CREATE INDEX IF NOT EXISTS idx_article_cves_article_url ON article_cves (article_url);
