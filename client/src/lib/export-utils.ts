import { apiRequest } from './queryClient';

export interface BookmarkExportData {
  exportedAt: string;
  totalBookmarks: number;
  bookmarks: Array<{
    title: string;
    summary: string | null;
    url: string;
    source: string;
    publishedAt: Date;
    threatLevel: string;
    tags: string[] | null;
    bookmarkedAt: Date | null;
  }>;
}

export async function exportBookmarks(): Promise<void> {
  try {
    // Fetch bookmarks export data
    const response = await fetch('/api/bookmarks?export=true');
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    
    // Get the content disposition header to extract filename
    const contentDisposition = response.headers.get('content-disposition');
    let filename = 'cyberfeed-bookmarks.json';
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    // Get the JSON data
    const exportData: BookmarkExportData = await response.json();
    
    // Create a downloadable blob
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    // Create download link and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

export async function exportBookmarksAsCSV(): Promise<void> {
  try {
    // Fetch bookmarks export data
    const response = await fetch('/api/bookmarks?export=true');
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    
    const exportData: BookmarkExportData = await response.json();
    
    // Convert to CSV format
    const csvHeaders = [
      'Title',
      'Summary', 
      'URL',
      'Source',
      'Published Date',
      'Threat Level',
      'Tags',
      'Bookmarked Date'
    ];
    
    const csvRows = exportData.bookmarks.map(bookmark => [
      `"${bookmark.title.replace(/"/g, '""')}"`,
      `"${(bookmark.summary || '').replace(/"/g, '""')}"`,
      `"${bookmark.url}"`,
      `"${bookmark.source}"`,
      `"${new Date(bookmark.publishedAt).toISOString()}"`,
      `"${bookmark.threatLevel}"`,
      `"${(bookmark.tags || []).join(', ')}"`,
      `"${bookmark.bookmarkedAt ? new Date(bookmark.bookmarkedAt).toISOString() : ''}"`
    ]);
    
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cyberfeed-bookmarks-${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('CSV export failed:', error);
    throw error;
  }
}