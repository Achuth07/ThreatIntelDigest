# Security Implementation Guide

## Authentication Mechanism

This application implements a secure JWT-based authentication system with the following features:

### Token Generation
- Uses HMAC-SHA256 signing algorithm for token security
- Includes issued at (iat) and expiration (exp) timestamps
- Tokens expire after 24 hours
- Tokens are refreshed automatically to maintain sessions

### Token Verification
- Implements timing-safe comparison to prevent timing attacks
- Validates token expiration
- Checks for future-dated tokens to prevent token manipulation
- Verifies token structure and signature integrity

### Session Management
- Stores authentication data in localStorage with automatic expiration
- Automatically redirects expired sessions to login
- Refreshes tokens on each authenticated request to extend sessions

## Environment Variables

For production deployment, ensure the following environment variables are set:

```
SESSION_SECRET=your_strong_secret_key_here
DATABASE_URL=your_database_connection_string
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
ADMIN_EMAIL=your_admin_email_address
```

The `SESSION_SECRET` should be a strong, random string at least 32 characters long.
The `ADMIN_EMAIL` should be set to the email address of the user who should have admin privileges.

## Admin Access Control

- Only users with the email specified in the `ADMIN_EMAIL` environment variable are granted admin privileges
- Admin endpoints require valid authentication tokens with admin flag
- All admin actions are logged for audit purposes

## API Security

- All API endpoints validate authentication tokens
- Admin endpoints require both authentication and admin privileges
- Proper HTTP status codes for different error conditions:
  - 401: Unauthorized (missing or invalid token)
  - 403: Forbidden (valid token but insufficient privileges)
  - 405: Method not allowed

## Frontend Security

- Tokens are stored in localStorage with automatic expiration checking
- Authentication state is validated on page load
- Admin UI components are only accessible to authenticated admin users
- Secure token handling prevents XSS and CSRF attacks

## Best Practices Implemented

1. **Secure Token Storage**: Tokens are stored in localStorage with automatic validation
2. **Token Refresh**: Tokens are refreshed on each authenticated request
3. **Timing Attack Prevention**: Uses timing-safe comparison for token verification
4. **Input Validation**: All API inputs are validated and sanitized
5. **Error Handling**: Proper error responses without exposing sensitive information
6. **Access Control**: Role-based access control for admin functions
7. **Environment-based Configuration**: Sensitive configuration values are set via environment variables