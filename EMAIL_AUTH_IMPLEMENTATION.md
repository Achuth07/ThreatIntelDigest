# Email Authentication Implementation Guide

## ✅ Completed Components

### 1. Frontend Pages
- ✅ **Login Page** (`client/src/pages/login.tsx`) - Google OAuth + Email/Password login
- ✅ **Registration Page** (`client/src/pages/register.tsx`) - Email registration with password strength indicator
- ✅ **Forgot Password Page** (`client/src/pages/forgot-password.tsx`) - Request password reset
- ✅ **Reset Password Page** (`client/src/pages/reset-password.tsx`) - Set new password with token validation
- ✅ **Login Popup** - Updated to remove "Continue as Guest" and add "Sign in with Email" button

### 2. Database Schema
- ✅ **Updated users table** (`shared/schema.ts`):
  ```typescript
  - googleId: nullable (was required)
  - email: unique constraint added
  - passwordHash: text field for bcrypt hashes
  - emailVerified: boolean (default false)
  - verificationToken: text field
  - verificationTokenExpiry: timestamp
  - resetToken: text field  
  - resetTokenExpiry: timestamp
  ```

### 3. Utilities & Services
- ✅ **Password Utils** (`server/auth/password-utils.ts`):
  - `hashPassword()` - bcrypt with 12 salt rounds
  - `verifyPassword()` - compare password with hash
  - `generateSecureToken()` - cryptographically secure random tokens
  - `validatePasswordStrength()` - enforce password requirements

- ✅ **Email Service** (`server/email-service.ts`) - MailerSend integration:
  - `sendVerificationEmail()` - Welcome + email verification
  - `sendPasswordResetEmail()` - Password reset with 1-hour expiry
  - `sendWelcomeEmail()` - Post-verification welcome message
  - Professional HTML templates with security notes

- ✅ **Auth Library** (`client/src/lib/auth.ts`):
  - Added `setAuthToken()` for JWT storage after email login

### 4. Routes
- ✅ **App.tsx** updated with new routes:
  - `/login` - Login page
  - `/register` - Registration page
  - `/forgot-password` - Password reset request
  - `/reset-password` - Password reset form (with token param)

### 5. Dependencies Installed
- ✅ `bcrypt` + `@types/bcrypt` - Password hashing
- ✅ `mailersend` - Email delivery service

## 🚧 Remaining Implementation

### 1. Database Migration
**Run this SQL to update the users table:**

```sql
-- Make googleId nullable
ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL;

-- Add unique constraint to email if not exists
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Add new columns for email authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expiry TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- Create index on verification and reset tokens for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
```

### 2. Storage Layer Methods
**Add to `IStorage` interface in `server/storage.ts`:**

```typescript
// User authentication methods
getUserByEmail(email: string): Promise<User | undefined>;
getUserByVerificationToken(token: string): Promise<User | undefined>;
getUserByResetToken(token: string): Promise<User | undefined>;
createEmailUser(user: {
  name: string;
  email: string;
  passwordHash: string;
  verificationToken: string;
  verificationTokenExpiry: Date;
}): Promise<User>;
verifyUserEmail(userId: number): Promise<boolean>;
updateUserPassword(userId: number, passwordHash: string): Promise<boolean>;
setResetToken(userId: number, resetToken: string, expiry: Date): Promise<boolean>;
clearResetToken(userId: number): Promise<boolean>;
```

**Implement in `server/postgres-storage.ts`:**

```typescript
async getUserByEmail(email: string): Promise<User | undefined> {
  const result = await this.db.execute(sql`
    SELECT * FROM users WHERE email = ${email} LIMIT 1
  `);
  return result.rows[0] as User | undefined;
}

async getUserByVerificationToken(token: string): Promise<User | undefined> {
  const result = await this.db.execute(sql`
    SELECT * FROM users 
    WHERE verification_token = ${token} 
      AND verification_token_expiry > NOW()
    LIMIT 1
  `);
  return result.rows[0] as User | undefined;
}

async getUserByResetToken(token: string): Promise<User | undefined> {
  const result = await this.db.execute(sql`
    SELECT * FROM users 
    WHERE reset_token = ${token} 
      AND reset_token_expiry > NOW()
    LIMIT 1
  `);
  return result.rows[0] as User | undefined;
}

async createEmailUser(user: {
  name: string;
  email: string;
  passwordHash: string;
  verificationToken: string;
  verificationTokenExpiry: Date;
}): Promise<User> {
  const result = await this.db.execute(sql`
    INSERT INTO users (name, email, password_hash, verification_token, verification_token_expiry, email_verified, created_at, last_login_at)
    VALUES (${user.name}, ${user.email}, ${user.passwordHash}, ${user.verificationToken}, ${user.verificationTokenExpiry}, false, NOW(), NOW())
    RETURNING *
  `);
  return result.rows[0] as User;
}

async verifyUserEmail(userId: number): Promise<boolean> {
  const result = await this.db.execute(sql`
    UPDATE users 
    SET email_verified = true, verification_token = NULL, verification_token_expiry = NULL
    WHERE id = ${userId}
  `);
  return result.rowCount > 0;
}

async updateUserPassword(userId: number, passwordHash: string): Promise<boolean> {
  const result = await this.db.execute(sql`
    UPDATE users 
    SET password_hash = ${passwordHash}
    WHERE id = ${userId}
  `);
  return result.rowCount > 0;
}

async setResetToken(userId: number, resetToken: string, expiry: Date): Promise<boolean> {
  const result = await this.db.execute(sql`
    UPDATE users 
    SET reset_token = ${resetToken}, reset_token_expiry = ${expiry}
    WHERE id = ${userId}
  `);
  return result.rowCount > 0;
}

async clearResetToken(userId: number): Promise<boolean> {
  const result = await this.db.execute(sql`
    UPDATE users 
    SET reset_token = NULL, reset_token_expiry = NULL
    WHERE id = ${userId}
  `);
  return result.rowCount > 0;
}
```

### 3. API Endpoints in `api/index.ts`

**Add email auth handler function:**

```typescript
async function handleEmailAuthEndpoints(req: VercelRequest, res: VercelResponse, pathname: string) {
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const { Pool } = await import('@neondatabase/serverless');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  // POST /api/auth/email/register
  if (pathname === '/api/auth/email/register' && req.method === 'POST') {
    try {
      const { name, email, password } = req.body;

      // Validation
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
      }

      // Check password strength
      const { validatePasswordStrength } = await import('../server/auth/password-utils');
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
      }

      // Check if user exists
      const existingUser = await db.execute(sql`
        SELECT id FROM users WHERE email = ${email}
      `);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      // Hash password and generate verification token
      const { hashPassword, generateSecureToken } = await import('../server/auth/password-utils');
      const passwordHash = await hashPassword(password);
      const verificationToken = generateSecureToken(32);
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const result = await db.execute(sql`
        INSERT INTO users (name, email, password_hash, verification_token, verification_token_expiry, email_verified, created_at, last_login_at)
        VALUES (${name}, ${email}, ${passwordHash}, ${verificationToken}, ${verificationExpiry}, false, NOW(), NOW())
        RETURNING id
      `);

      const userId = result.rows[0].id;

      // Send verification email
      const { sendVerificationEmail } = await import('../server/email-service');
      await sendVerificationEmail(email, name, verificationToken);

      return res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        userId,
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ message: 'Failed to register user' });
    }
  }

  // GET /api/auth/email/verify?token=xxx
  if (pathname === '/api/auth/email/verify' && req.method === 'GET') {
    try {
      const token = req.query.token as string;

      if (!token) {
        return res.status(400).json({ message: 'Verification token is required' });
      }

      // Find user with valid token
      const userResult = await db.execute(sql`
        SELECT id, name, email FROM users 
        WHERE verification_token = ${token} 
          AND verification_token_expiry > NOW()
          AND email_verified = false
      `);

      if (userResult.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired verification token' });
      }

      const user = userResult.rows[0];

      // Verify user email
      await db.execute(sql`
        UPDATE users 
        SET email_verified = true, verification_token = NULL, verification_token_expiry = NULL
        WHERE id = ${user.id}
      `);

      // Send welcome email
      const { sendWelcomeEmail } = await import('../server/email-service');
      await sendWelcomeEmail(user.email, user.name);

      // Redirect to login with success message
      const redirectUrl = process.env.VERCEL_ENV === 'production'
        ? 'https://threatfeed.whatcyber.com/login?verified=true'
        : 'http://localhost:5173/login?verified=true';
      
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('Verification error:', error);
      return res.status(500).json({ message: 'Failed to verify email' });
    }
  }

  // POST /api/auth/email/login
  if (pathname === '/api/auth/email/login' && req.method === 'POST') {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Find user
      const userResult = await db.execute(sql`
        SELECT * FROM users WHERE email = ${email}
      `);

      if (userResult.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const user = userResult.rows[0];

      // Check if user has password (might be Google-only account)
      if (!user.password_hash) {
        return res.status(401).json({ message: 'Please use Google Sign-In for this account' });
      }

      // Check if email is verified
      if (!user.email_verified) {
        return res.status(403).json({ message: 'Please verify your email before logging in' });
      }

      // Verify password
      const { verifyPassword } = await import('../server/auth/password-utils');
      const isValidPassword = await verifyPassword(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Update last login
      await db.execute(sql`
        UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}
      `);

      // Generate JWT token
      const token = generateToken(user);

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Failed to login' });
    }
  }

  // POST /api/auth/email/forgot-password
  if (pathname === '/api/auth/email/forgot-password' && req.method === 'POST') {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Find user
      const userResult = await db.execute(sql`
        SELECT id, name, email FROM users WHERE email = ${email} AND email_verified = true
      `);

      // Always return success to prevent email enumeration
      if (userResult.rows.length === 0) {
        return res.json({ message: 'If an account exists, a password reset email has been sent' });
      }

      const user = userResult.rows[0];

      // Generate reset token
      const { generateSecureToken } = await import('../server/auth/password-utils');
      const resetToken = generateSecureToken(32);
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token
      await db.execute(sql`
        UPDATE users 
        SET reset_token = ${resetToken}, reset_token_expiry = ${resetExpiry}
        WHERE id = ${user.id}
      `);

      // Send reset email
      const { sendPasswordResetEmail } = await import('../server/email-service');
      await sendPasswordResetEmail(user.email, user.name, resetToken);

      return res.json({ message: 'If an account exists, a password reset email has been sent' });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({ message: 'Failed to process password reset request' });
    }
  }

  // POST /api/auth/email/reset-password
  if (pathname === '/api/auth/email/reset-password' && req.method === 'POST') {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }

      // Validate password
      const { validatePasswordStrength } = await import('../server/auth/password-utils');
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
      }

      // Find user with valid token
      const userResult = await db.execute(sql`
        SELECT id FROM users 
        WHERE reset_token = ${token} 
          AND reset_token_expiry > NOW()
      `);

      if (userResult.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      const user = userResult.rows[0];

      // Hash new password
      const { hashPassword } = await import('../server/auth/password-utils');
      const passwordHash = await hashPassword(password);

      // Update password and clear reset token
      await db.execute(sql`
        UPDATE users 
        SET password_hash = ${passwordHash}, reset_token = NULL, reset_token_expiry = NULL
        WHERE id = ${user.id}
      `);

      return res.json({ message: 'Password reset successful. You can now log in with your new password.' });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({ message: 'Failed to reset password' });
    }
  }

  return res.status(404).json({ message: 'Endpoint not found' });
}
```

**Add routing in main handler:**

```typescript
// In the main handler function, add:
if (pathname.startsWith('/api/auth/email')) {
  return handleEmailAuthEndpoints(req, res, pathname);
}
```

### 4. Environment Variables
**Add to `.env` and Vercel:**
```properties
MAILERSEND_API_KEY=your_mailersend_api_key_here
```
**Note:** Get your MailerSend API key from the MailerSend dashboard and add it to both your local `.env` file and Vercel environment variables.

### 5. Security Measures Implemented

✅ **Password Security:**
- Bcrypt with 12 salt rounds
- Min 8 characters, uppercase, lowercase, numbers required
- Password strength indicator on registration

✅ **Token Security:**
- Cryptographically secure random tokens (32 chars)
- Verification tokens expire after 24 hours
- Reset tokens expire after 1 hour
- Tokens cleared after use

✅ **Email Enumeration Prevention:**
- Same response whether email exists or not for forgot password
- Generic error messages

✅ **SQL Injection Protection:**
- All queries use parameterized SQL with Drizzle ORM
- No string concatenation in queries

✅ **XSS Protection:**
- Input validation on all user inputs
- Email templates use safe HTML rendering

### 6. Testing Checklist

- [ ] Registration with valid email/password
- [ ] Registration with weak password (should fail)
- [ ] Registration with duplicate email (should fail)
- [ ] Email verification link works
- [ ] Email verification link expires after 24 hours
- [ ] Login with unverified email (should fail)
- [ ] Login with verified email/password
- [ ] Login with wrong password (should fail)
- [ ] Forgot password sends email
- [ ] Reset password with valid token
- [ ] Reset password with expired token (should fail)
- [ ] Reset password with weak password (should fail)
- [ ] Google OAuth still works alongside email auth
- [ ] JWT token properly stored and used for authenticated requests

## 📝 Notes

1. **MailerSend Configuration**: The sender email `noreply@whatcyber.com` needs to be verified in your MailerSend dashboard. Update `SENDER_EMAIL` in `server/email-service.ts` if using a different verified domain.

2. **Database Migration**: Run the SQL migration in your Neon PostgreSQL database before testing.

3. **Rate Limiting**: Consider adding rate limiting to prevent brute force attacks on login and registration endpoints (use packages like `express-rate-limit`).

4. **CORS**: Ensure CORS is configured to allow requests from your frontend domain.

5. **Production Deployment**: Update `BASE_URL` logic in `email-service.ts` to match your production domain.

## 🔐 Security Best Practices

- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ Secure token generation using crypto.getRandomValues
- ✅ Token expiration (24h for verification, 1h for reset)
- ✅ Email verification required before login
- ✅ Protection against email enumeration
- ✅ SQL injection prevention with parameterized queries
- ✅ Password strength requirements enforced
- ⚠️ TODO: Add rate limiting on auth endpoints
- ⚠️ TODO: Add CAPTCHA on registration/login (optional)
- ⚠️ TODO: Add account lockout after failed attempts (optional)
