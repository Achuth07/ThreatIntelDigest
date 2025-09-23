# CVE Navigation Fix

This document describes the fix implemented to allow users to exit the CVE page by clicking on "Threat Intel Sources" in the sidebar.

## Problem

When users navigated to the "Latest CVEs" page, they could only exit by clicking the X mark in the top right corner. They were unable to exit by clicking on any of the "Threat Intel Sources" in the sidebar.

## Root Cause

The issue was in the [handleSourceSelect](file:///Users/achuth/Projects/ThreatIntelDigest/client/src/pages/home.tsx#L92-L102) function in the home page component. When a user clicked on a source in the sidebar, the function would set the selected source but didn't check if the vulnerabilities view was open and close it accordingly.

## Solution

The fix involved modifying the [handleSourceSelect](file:///Users/achuth/Projects/ThreatIntelDigest/client/src/pages/home.tsx#L92-L102) function to also close the vulnerabilities view when a source is selected:

```typescript
const handleSourceSelect = (source: string) => {
  // Exit bookmark page when selecting a source
  if (showBookmarks) {
    setShowBookmarks(false);
  }
  // Exit vulnerabilities page when selecting a source
  if (showVulnerabilities) {
    setShowVulnerabilities(false);
  }
  setSelectedSource(source);
  setPage(0); // Reset pagination when changing source
};
```

## Benefits

1. **Improved User Experience**: Users can now navigate away from the CVE page using sidebar navigation
2. **Consistent Behavior**: The behavior is now consistent with how the bookmarks page works
3. **Intuitive Navigation**: Users can naturally switch between different views using the sidebar
4. **No Breaking Changes**: The existing functionality (X button) still works

## Testing

To test the fix:

1. Navigate to the "Latest CVEs" page
2. Click on any "Threat Intel Source" in the sidebar
3. Verify that the CVE page closes and the articles for that source are displayed
4. Verify that the X button still works to close the CVE page

## Additional Notes

- The fix follows the same pattern already established for the bookmarks page
- The solution is minimal and focused, only adding the necessary check for the vulnerabilities view
- No changes were needed to the sidebar or CVE components themselves
- The fix maintains all existing functionality while adding the new navigation capability