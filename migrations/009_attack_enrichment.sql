-- Migration: ATT&CK IDs, techniques, software and actor-CVE links for threat actors (WHA-55)
-- Date: 2026-11-20
-- Filled by scripts/ingest-threat-actors.ts (ATT&CK bundle) and scripts/link-threat-actors.ts
-- (news). All tables are small: about 180 groups, 700 techniques, 850 software, 6,000 links.

-- G0016 and so on. attack_status is 'active', 'deprecated' or 'revoked'; groups are never deleted,
-- so their public pages keep working, and revoked_by names the replacing group.
ALTER TABLE threat_groups ADD COLUMN IF NOT EXISTS attack_id TEXT;
ALTER TABLE threat_groups ADD COLUMN IF NOT EXISTS attack_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE threat_groups ADD COLUMN IF NOT EXISTS revoked_by TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_threat_groups_attack_id ON threat_groups (attack_id);

CREATE TABLE IF NOT EXISTS attack_techniques (
  stix_id TEXT PRIMARY KEY,
  attack_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  tactics JSONB NOT NULL DEFAULT '[]',
  platforms JSONB NOT NULL DEFAULT '[]',
  is_subtechnique BOOLEAN NOT NULL DEFAULT false,
  parent_attack_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  modified TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attack_software (
  stix_id TEXT PRIMARY KEY,
  attack_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  software_type TEXT NOT NULL,
  description TEXT,
  aliases JSONB NOT NULL DEFAULT '[]',
  platforms JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  modified TIMESTAMP
);

-- description is ATT&CK's procedure example: how this group uses the technique or software.
CREATE TABLE IF NOT EXISTS actor_techniques (
  threat_group_id UUID NOT NULL REFERENCES threat_groups(id) ON DELETE CASCADE,
  technique_stix_id TEXT NOT NULL REFERENCES attack_techniques(stix_id) ON DELETE CASCADE,
  description TEXT,
  PRIMARY KEY (threat_group_id, technique_stix_id)
);
CREATE INDEX IF NOT EXISTS idx_actor_techniques_technique ON actor_techniques (technique_stix_id);

CREATE TABLE IF NOT EXISTS actor_software (
  threat_group_id UUID NOT NULL REFERENCES threat_groups(id) ON DELETE CASCADE,
  software_stix_id TEXT NOT NULL REFERENCES attack_software(stix_id) ON DELETE CASCADE,
  description TEXT,
  PRIMARY KEY (threat_group_id, software_stix_id)
);
CREATE INDEX IF NOT EXISTS idx_actor_software_software ON actor_software (software_stix_id);

-- source 'attack': MITRE's own text says the group used the CVE (confidence 'high').
-- source 'news': an article names both; co-occurrence, not attribution (confidence 'low').
-- evidence is a short quote or article title; evidence_url points to it; evidence_count is how many
-- relationships or articles back the link. cve_id has no foreign key, as some CVEs predate our coverage.
CREATE TABLE IF NOT EXISTS actor_cves (
  threat_group_id UUID NOT NULL REFERENCES threat_groups(id) ON DELETE CASCADE,
  cve_id VARCHAR(32) NOT NULL,
  source TEXT NOT NULL,
  confidence TEXT NOT NULL,
  evidence TEXT,
  evidence_url TEXT,
  evidence_count INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (threat_group_id, cve_id, source)
);
CREATE INDEX IF NOT EXISTS idx_actor_cves_cve ON actor_cves (cve_id);
