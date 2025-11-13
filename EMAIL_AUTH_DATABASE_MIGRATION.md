# Email Authentication Database Migration

This document contains the SQL commands needed to migrate the existing users table to support email/password authentication.

## Prerequisites

- Access to Neon PostgreSQL console or psql CLI
- Backup your database before running these commands (recommended)

## Migration Steps

### Step 1: Make google_id Nullable

The `google_id` column needs to be nullable since users authenticating with email/password won't have a Google ID.

```sql
ALTER TABLE users 
ALTER COLUMN google_id DROP NOT NULL;
```

### Step 2: Add Unique Constraint to Email

Ensure email addresses are unique across the system.

```sql
ALTER TABLE users 
ADD CONSTRAINT users_email_unique UNIQUE (email);
```

### Step 3: Add Email Authentication Columns

Add all new columns needed for email/password authentication.

```sql
-- Password hash column
ALTER TABLE users 
ADD COLUMN password_hash TEXT;

-- Email verification status
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE NOT NULL;

-- Email verification token
ALTER TABLE users 
ADD COLUMN verification_token TEXT;

-- Email verification token expiry
ALTER TABLE users 
ADD COLUMN verification_token_expiry TIMESTAMP;

-- Password reset token
ALTER TABLE users 
ADD COLUMN reset_token TEXT;

-- Password reset token expiry
ALTER TABLE users 
ADD COLUMN reset_token_expiry TIMESTAMP;
```

### Step 4: Create Indexes for Performance

Add indexes on frequently queried columns.

```sql
-- Index for email lookups (used during login)
CREATE INDEX idx_users_email ON users(email);

-- Index for verification token lookups
CREATE INDEX idx_users_verification_token ON users(verification_token);

-- Index for reset token lookups
CREATE INDEX idx_users_reset_token ON users(reset_token);
```

### Step 5: Update Existing Google OAuth Users

Set `email_verified` to `true` for existing Google OAuth users (they already have verified emails).

```sql
UPDATE users 
SET email_verified = TRUE 
WHERE google_id IS NOT NULL;
```

## Verification

After running the migration, verify the schema:

```sql
-- Check table structure
\d users

-- Verify indexes were created
\di users*

-- Verify existing users are marked as email_verified
SELECT id, name, email, google_id, email_verified, password_hash 
FROM users 
LIMIT 5;
```

Expected output:
- `google_id` should allow NULL values
- `email` should have UNIQUE constraint
- New columns should exist: `password_hash`, `email_verified`, `verification_token`, `verification_token_expiry`, `reset_token`, `reset_token_expiry`
- Existing Google OAuth users should have `email_verified = true`
- Indexes should exist: `idx_users_email`, `idx_users_verification_token`, `idx_users_reset_token`

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_users_reset_token;
DROP INDEX IF EXISTS idx_users_verification_token;
DROP INDEX IF EXISTS idx_users_email;

-- Remove columns (WARNING: This will delete data)
ALTER TABLE users DROP COLUMN IF EXISTS reset_token_expiry;
ALTER TABLE users DROP COLUMN IF EXISTS reset_token;
ALTER TABLE users DROP COLUMN IF EXISTS verification_token_expiry;
ALTER TABLE users DROP COLUMN IF EXISTS verification_token;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- Remove unique constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;

-- Make google_id required again (only if you're sure all users have it)
-- ALTER TABLE users ALTER COLUMN google_id SET NOT NULL;
```

## Next Steps

After successfully running the migration:

1. Test the email registration flow
2. Test the email verification process
3. Test the login with email/password
4. Test the password reset flow
5. Verify that Google OAuth login still works

## Environment Variables Required

Ensure these environment variables are set:

- `DATABASE_URL` - Neon PostgreSQL connection string
- `MAILERSEND_API_KEY` - MailerSend API key for sending emails
- `SESSION_SECRET` - Secret key for JWT token signing
- `ADMIN_EMAIL` - (Optional) Admin user email for special permissions

## MailerSend Template IDs

The system uses the following MailerSend template IDs:
- Email Verification: `x2p034709jkgzdrn`
- Password Reset: `zr6ke4n69qylon12`

Make sure these templates are configured in your MailerSend account with the appropriate variables:
- Verification template: `name`, `verification_url`
- Reset template: `name`, `reset_url`
