# Vercel Bookmark API Fix

This document describes the fix implemented to resolve the "Cannot find module" error for the `/api/bookmarks` endpoint when deployed to Vercel.

## Problem

The original implementation was trying to import the [PostgresStorage](file:///Users/achuth/Projects/ThreatIntelDigest/server/postgres-storage.ts#L7-L454) class using relative paths:
```typescript
import { PostgresStorage } from '../server/postgres-storage';
```

This caused a "Cannot find module" error in the Vercel deployment environment because Vercel serverless functions are deployed independently and cannot import from other parts of the codebase using relative paths in the same way.

## Solution

The fix involves making the bookmarks API function self-contained by:

1. **Removing external imports**: Removed the import of [PostgresStorage](file:///Users/achuth/Projects/ThreatIntelDigest/server/postgres-storage.ts#L7-L454) and instead implementing a simplified storage class directly in the file.

2. **Using dynamic imports**: For database operations, we use dynamic imports to load the required modules only when needed:
   ```typescript
   const { drizzle } = await import('drizzle-orm/neon-serverless');
   const { Pool } = await import('@neondatabase/serverless');
   const { eq, desc } = await import('drizzle-orm');
   const { sql } = await import('drizzle-orm');
   ```

3. **Implementing a simplified storage class**: Created a [SimpleBookmarkStorage](file:///Users/achuth/Projects/ThreatIntelDigest/api/bookmarks.ts#L34-L187) class that handles both in-memory storage (for local development) and database operations (for production).

## Key Changes

### 1. Removed External Dependencies
- Removed import of [PostgresStorage](file:///Users/achuth/Projects/ThreatIntelDigest/server/postgres-storage.ts#L7-L454)
- Removed import of [insertBookmarkSchema](file:///Users/achuth/Projects/ThreatIntelDigest/shared/schema.ts#L101-L106) (kept only the schema import for validation)

### 2. Added Dynamic Module Loading
All database-related imports are now loaded dynamically within async functions:
```typescript
// For database operations
const { drizzle } = await import('drizzle-orm/neon-serverless');
const { Pool } = await import('@neondatabase/serverless');
const { eq, desc } = await import('drizzle-orm');
const { sql } = await import('drizzle-orm');
```

### 3. Self-Contained Storage Implementation
Created a [SimpleBookmarkStorage](file:///Users/achuth/Projects/ThreatIntelDigest/api/bookmarks.ts#L34-L187) class with methods for:
- `getBookmarks(userId: number)`
- `createBookmark(data: { articleId: string; userId: number })`
- `deleteBookmark(articleId: string, userId: number)`

### 4. Maintained Backward Compatibility
- Still supports in-memory storage for local development
- Maintains the same API interface
- Preserves authentication requirements

## Benefits

1. **Vercel Compatibility**: Works correctly in Vercel's serverless environment
2. **Self-Contained**: No external dependencies that could cause import errors
3. **Dynamic Loading**: Only loads database modules when needed, reducing cold start times
4. **Backward Compatible**: Maintains the same functionality and API interface

## Testing

To test the fix:

1. Deploy to Vercel
2. Try accessing `/api/bookmarks` endpoint
3. Test bookmark creation with an authenticated user
4. Test bookmark deletion with an authenticated user
5. Verify that unauthenticated requests are properly rejected

## Additional Notes

- This approach follows Vercel's best practices for serverless functions
- Dynamic imports help reduce the cold start time by only loading modules when needed
- The implementation maintains the same security and authentication requirements as the original