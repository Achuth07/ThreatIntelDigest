-- Email Authentication Migration
-- This migration adds support for email/password authentication alongside Google OAuth

-- Step 1: Make google_id nullable (users can now register with email instead of Google)
ALTER TABLE users 
ALTER COLUMN google_id DROP NOT NULL;

-- Step 2: Add unique constraint to email
ALTER TABLE users 
ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Step 3: Add password hash column
ALTER TABLE users 
ADD COLUMN password_hash TEXT;

-- Step 4: Add email verification status
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE NOT NULL;

-- Step 5: Add email verification token
ALTER TABLE users 
ADD COLUMN verification_token TEXT;

-- Step 6: Add email verification token expiry
ALTER TABLE users 
ADD COLUMN verification_token_expiry TIMESTAMP;

-- Step 7: Add password reset token
ALTER TABLE users 
ADD COLUMN reset_token TEXT;

-- Step 8: Add password reset token expiry
ALTER TABLE users 
ADD COLUMN reset_token_expiry TIMESTAMP;

-- Step 9: Create index for email lookups (used during login)
CREATE INDEX idx_users_email ON users(email);

-- Step 10: Create index for verification token lookups
CREATE INDEX idx_users_verification_token ON users(verification_token);

-- Step 11: Create index for reset token lookups
CREATE INDEX idx_users_reset_token ON users(reset_token);

-- Step 12: Update existing Google OAuth users (mark their emails as verified)
UPDATE users 
SET email_verified = TRUE 
WHERE google_id IS NOT NULL;
