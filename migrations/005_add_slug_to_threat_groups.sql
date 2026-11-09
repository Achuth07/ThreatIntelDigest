-- Migration: Add slug column to threat_groups
-- Date: 2026-11-09
-- Description: Readable public address for threat actors (WHA-18), e.g. /threat-actors/salt-typhoon.
--              Additive and nullable, so the current site keeps working before and after it runs.
--              Fill the column afterwards with: npx tsx scripts/backfill-threat-group-slugs.ts

ALTER TABLE threat_groups
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Unique, but NULL is allowed until the backfill has run
CREATE UNIQUE INDEX IF NOT EXISTS ux_threat_groups_slug ON threat_groups (slug);
