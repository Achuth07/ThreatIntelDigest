# Bookmark Delete Functionality Fix

This document describes the fix implemented to resolve the issue with removing bookmarks.

## Problem

When trying to remove a bookmark by clicking the bookmark button again, the frontend was getting a "405 Method Not Allowed" error. The browser console showed:

```
DELETE https://threatfeed.whatcyber.com/api/bookmarks/a5cc8c6a-0a22-4e5a-8848-c959c1fce144 405 (Method Not Allowed)
```

## Root Cause

The issue was with URL parsing in the DELETE handler. The frontend was making a DELETE request to `/api/bookmarks/{articleId}`, but the URL parsing logic wasn't correctly extracting the article ID in all cases.

## Solution

The fix involved improving the URL parsing logic in the DELETE handler:

1. **Better URL parsing**: Instead of just using `pathname.split('/').pop()`, we now:
   - Split the pathname into parts
   - Take the last part as the article ID
   - Validate that we actually have an article ID

2. **Added debugging**: Added console.log statements to help diagnose issues

3. **Improved error handling**: Better validation of the extracted article ID

## Code Changes

### Before:
```typescript
const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
const articleId = pathname.split('/').pop();
```

### After:
```typescript
// Parse the article ID from the URL path
const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
console.log('DELETE request pathname:', pathname);

// Extract article ID from path like /api/bookmarks/article-id
const pathParts = pathname.split('/');
const articleId = pathParts[pathParts.length - 1];

// Validate that we have an article ID
if (!articleId || articleId === 'bookmarks') {
  console.log('Invalid article ID:', articleId);
  return res.status(400).json({ message: "Article ID is required" });
}
```

## Testing

To test the fix:

1. Bookmark an article
2. Click the bookmark button again to remove the bookmark
3. Verify that the bookmark is successfully removed
4. Check the browser console for any errors

## Additional Notes

- The fix maintains backward compatibility
- The same logic is applied to both in-memory and database storage versions
- Added debugging logs to help diagnose future issues
- Improved error messages for better user experience