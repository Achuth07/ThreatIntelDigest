# User-Specific Bookmarks Implementation

This document describes the changes made to implement user-specific bookmarks that persist across sessions.

## Changes Made

### 1. Database Schema Update
- Added a `userId` column to the `bookmarks` table to associate bookmarks with users
- Added a foreign key constraint referencing the `users` table
- Created an index on the `userId` column for better performance

### 2. Backend Changes
- Updated the `PostgresStorage` class to handle user-specific bookmarks:
  - Modified `getBookmarks()` to filter by userId
  - Modified `getBookmarksWithArticles()` to filter by userId
  - Modified `createBookmark()` to include userId
  - Modified `deleteBookmark()` to filter by both articleId and userId
  - Modified `isBookmarked()` to filter by both articleId and userId
- Updated the bookmarks API (`/api/bookmarks`) to:
  - Require authentication for POST and DELETE requests
  - Filter bookmarks by userId for GET requests
  - Include userId when creating bookmarks

### 3. Frontend Changes
- Updated the API client to include authentication tokens in requests
- Updated the home page to:
  - Only fetch bookmarks for authenticated users
  - Show a message when unauthenticated users try to access bookmarks
- Updated the article card component to:
  - Check authentication before allowing bookmarking
  - Show appropriate error messages for unauthenticated users

### 4. Schema Validation
- Updated the `insertBookmarkSchema` to include validation for the `userId` field

## Migration Steps

To apply the database changes, run the migration script:

```bash
node scripts/run-migration.cjs
```

Before running the migration, make sure to:

1. Set the `DATABASE_URL` environment variable in your `.env` file
2. Install the required dependencies: `npm install dotenv @neondatabase/serverless`

## Manual SQL Migration

If you prefer to run the migration manually, execute the following SQL statements:

```sql
-- Add the user_id column to bookmarks table
ALTER TABLE bookmarks 
ADD COLUMN user_id INTEGER REFERENCES users(id);

-- For existing bookmarks, assign them to a specific user (adjust user ID as needed)
UPDATE bookmarks 
SET user_id = 1 
WHERE user_id IS NULL;

-- Make the user_id column NOT NULL
ALTER TABLE bookmarks 
ALTER COLUMN user_id SET NOT NULL;

-- Add an index for better performance
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
```

Note: In the UPDATE statement, replace `1` with the appropriate user ID for existing bookmarks.

## Testing

To test the implementation:

1. Log in as a user
2. Bookmark some articles
3. Log out and log back in
4. Verify that your bookmarks are still visible
5. Try bookmarking articles as a different user
6. Verify that users can only see their own bookmarks

## Security Considerations

- All bookmark operations (create, delete, list) now require authentication
- Users can only access their own bookmarks
- Proper input validation is in place for all bookmark operations