/**
 * Extracts the domain from a URL
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Generates a favicon URL using Google's Favicon API
 * @param sourceUrl - The RSS feed URL or website URL
 * @param size - The size of the favicon (default: 32)
 * @returns The favicon URL
 */
export function getFaviconUrl(sourceUrl: string | null | undefined, size: number = 32): string {
  if (!sourceUrl) {
    // Return a default RSS icon if no URL is provided
    return `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/></svg>')}`;
  }

  // Special case for WhatCyber Blog
  if (sourceUrl.includes('whatcyber') || sourceUrl.includes('/api/rss/whatcyber')) {
    return '/android-chrome-192x192.png';
  }

  const domain = extractDomain(sourceUrl);
  if (!domain) {
    // Return default RSS icon if domain extraction fails
    return `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/></svg>')}`;
  }

  // Use Google's Favicon API
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

/**
 * Alternative favicon service using DuckDuckGo (privacy-focused)
 */
export function getFaviconUrlDDG(sourceUrl: string | null | undefined): string {
  if (!sourceUrl) {
    return `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/></svg>')}`;
  }

  const domain = extractDomain(sourceUrl);
  if (!domain) {
    return `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/></svg>')}`;
  }

  // Use DuckDuckGo's favicon service
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}
