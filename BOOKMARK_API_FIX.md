# Bookmark API Fix

This document describes the fixes implemented to resolve the 500 Internal Server Error for the `/api/bookmarks` endpoint.

## Issues Identified

1. **Incorrect Import Paths**: The API was using path aliases (`@/server/postgres-storage`) which don't work in the Vercel deployment environment.

2. **Schema Validation Mismatch**: The `insertBookmarkSchema` was updated to require a `userId`, but the API was trying to validate the entire request body including the `userId` which should come from authentication, not the request body.

## Fixes Implemented

### 1. Corrected Import Paths

Changed from:
```typescript
import { PostgresStorage } from '@/server/postgres-storage';
import { insertBookmarkSchema } from '@/shared/schema';
```

To:
```typescript
import { PostgresStorage } from '../server/postgres-storage';
import { insertBookmarkSchema } from '../shared/schema';
```

### 2. Fixed Schema Validation

Updated the POST endpoint to validate only the `articleId` from the request body, since `userId` comes from the authentication token:

```typescript
// For validation, we only need to check the articleId since userId comes from auth
const { articleId } = req.body;
if (!articleId) {
  return res.status(400).json({ message: "Article ID is required" });
}

const bookmark = await storage.createBookmark({ articleId, userId });
```

### 3. Updated Error Handling

Improved error handling to provide more specific error messages:
- 401 Unauthorized for unauthenticated requests
- 400 Bad Request for missing or invalid data
- 404 Not Found for missing bookmarks
- 500 Internal Server Error for server-side issues

## Testing

To test the fix:

1. Deploy the updated code to Vercel
2. Try accessing `/api/bookmarks` endpoint
3. Test bookmark creation with an authenticated user
4. Test bookmark deletion with an authenticated user
5. Verify that unauthenticated requests are properly rejected

## Additional Notes

- The fix maintains backward compatibility by allowing unauthenticated GET requests but returning empty results
- User-specific bookmarks are now properly enforced with authentication
- All bookmark operations (create, delete, list) now require proper authentication