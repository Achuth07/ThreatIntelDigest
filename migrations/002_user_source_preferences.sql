-- Migration to add user_source_preferences table
-- This table will store user-specific source preferences

-- Create the user_source_preferences table
CREATE TABLE user_source_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id VARCHAR NOT NULL REFERENCES rss_sources(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure a user can only have one preference per source
  UNIQUE(user_id, source_id)
);

-- Create indexes for better performance
CREATE INDEX idx_user_source_preferences_user_id ON user_source_preferences(user_id);
CREATE INDEX idx_user_source_preferences_source_id ON user_source_preferences(source_id);
CREATE INDEX idx_user_source_preferences_active ON user_source_preferences(is_active);

-- Insert default preferences for existing users
-- First, get the default sources (Bleeping Computer, Microsoft Security Blog, The DFIR Report, Unit 42, The Hacker News)
-- This will be handled in the application code when users first access the feature