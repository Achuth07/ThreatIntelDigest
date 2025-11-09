-- Migration: Add user_preferences table (simplified - no triggers)
-- Date: 2025-11-08

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

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
