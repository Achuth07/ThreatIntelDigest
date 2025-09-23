# Bookmark Delete Routing Fix

This document describes the fix implemented to resolve the "405 Method Not Allowed" error when removing bookmarks.

## Problem

The DELETE request to remove bookmarks was returning a "405 Method Not Allowed" error:

```
DELETE https://threatfeed.whatcyber.com/api/bookmarks/a5cc8c6a-0a22-4e5a-8848-c959c1fce144 405 (Method Not Allowed)
```

## Root Cause

The issue was related to how Vercel routes API requests with path parameters. The DELETE request with a path parameter like `/api/bookmarks/{articleId}` was not being properly routed to our bookmarks API handler.

## Solution

The fix involved two parts:

### 1. Updated Frontend Request

Changed the frontend to send the article ID as a query parameter instead of a path parameter:

**Before:**
```typescript
return apiRequest('DELETE', `/api/bookmarks/${article.id}`);
```

**After:**
```typescript
return apiRequest('DELETE', `/api/bookmarks?articleId=${article.id}`);
```

### 2. Updated Backend Handler

Modified the bookmarks API handler to accept the article ID as either a query parameter or extract it from the URL path:

```typescript
// Parse the article ID from query parameters or URL path
let articleId: string | undefined;

// First check query parameters
if (req.query && req.query.articleId) {
  articleId = req.query.articleId as string;
} else {
  // Fallback to URL path parsing
  const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
  console.log('DELETE request pathname:', pathname);
  
  // Extract article ID from path like /api/bookmarks/article-id
  const pathParts = pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  
  // Validate that we have an article ID
  if (lastPart && lastPart !== 'bookmarks') {
    articleId = lastPart;
  }
}
```

## Benefits

1. **Vercel Compatibility**: Works correctly with Vercel's routing system
2. **Backward Compatibility**: Still supports path parameters as a fallback
3. **Flexibility**: Can handle both query parameters and path parameters
4. **Better Error Handling**: Improved validation and error messages

## Testing

To test the fix:

1. Bookmark an article
2. Click the bookmark button again to remove the bookmark
3. Verify that the bookmark is successfully removed
4. Check the browser console for any errors

## Additional Notes

- This approach follows REST API best practices
- The solution is more robust as it handles both query parameters and path parameters
- Added debugging logs to help diagnose future issues
- Maintains the same security and authentication requirements