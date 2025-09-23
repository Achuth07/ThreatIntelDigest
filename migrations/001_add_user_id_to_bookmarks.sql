-- Migration to add user_id column to bookmarks table
-- This migration assumes you have a way to associate existing bookmarks with users
-- For existing bookmarks, we'll set a default user ID (you may want to adjust this logic)

-- Add the user_id column to bookmarks table
ALTER TABLE bookmarks 
ADD COLUMN user_id INTEGER REFERENCES users(id);

-- For existing bookmarks, you might want to:
-- 1. Assign them to a specific user (e.g., admin user with ID 1)
-- 2. Or delete them if they can't be associated with a user
-- Here we're setting a default user ID of 1 for existing bookmarks
UPDATE bookmarks 
SET user_id = 1 
WHERE user_id IS NULL;

-- Make the user_id column NOT NULL
ALTER TABLE bookmarks 
ALTER COLUMN user_id SET NOT NULL;

-- Add an index for better performance
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);