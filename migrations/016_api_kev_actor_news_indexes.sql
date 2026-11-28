-- Migration: Indexes for the v1 KEV, threat actor and news endpoints (WHA-59, WHA-62, WHA-63)
-- Date: 2026-11-28
-- All tables here are small (about 1,800 KEV rows, 1,600 articles), so these build in moments.

-- GET /v1/kev sorts and filters by date_added and due_date.
CREATE INDEX IF NOT EXISTS idx_kev_date_added ON known_exploited_vulnerabilities (date_added DESC);
CREATE INDEX IF NOT EXISTS idx_kev_due_date ON known_exploited_vulnerabilities (due_date);

-- article_threat_groups had only its serial primary key. /v1/threat-actors/{id}/articles and
-- /v1/news?threat_actor= look it up by actor; news items list their actors by article.
CREATE INDEX IF NOT EXISTS idx_article_threat_groups_group ON article_threat_groups (threat_group_id);
CREATE INDEX IF NOT EXISTS idx_article_threat_groups_article ON article_threat_groups (article_id);

ANALYZE known_exploited_vulnerabilities;
ANALYZE article_threat_groups;
