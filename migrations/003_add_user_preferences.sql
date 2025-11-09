-- Migration: Add user_preferences table
-- Date: 2025-11-08
-- Description: Add table to store user preferences including display name, watchlist settings, IOC preferences, and email notifications

CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  watchlist_keywords TEXT,
  auto_extract_iocs BOOLEAN DEFAULT true,
  auto_enrich_iocs BOOLEAN DEFAULT false,
  hidden_ioc_types JSONB DEFAULT '[]'::jsonb,
  email_weekly_digest BOOLEAN DEFAULT false,
  email_watchlist_alerts BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at_trigger
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();
