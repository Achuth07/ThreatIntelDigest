import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import all the handlers
import articlesHandler from './articles';
import authHandler from './auth';
import bookmarksHandler from './bookmarks';
import databaseHandler from './database';
import fetchArticleHandler from './fetch-article';
import fetchCvesHandler from './fetch-cves';
import fetchFeedsHandler from './fetch-feeds';
import sourcesHandler from './sources';
import userManagementHandler from './user-management';
import userSourcePreferencesHandler from './user-source-preferences';
import visitorCountHandler from './visitor-count';
import vulnerabilitiesHandler from './vulnerabilities';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
  
  // Route to appropriate API endpoints based on pathname
  if (pathname.startsWith('/api/sources')) {
    return sourcesHandler(req, res);
  }
  
  if (pathname.startsWith('/api/articles')) {
    return articlesHandler(req, res);
  }
  
  if (pathname.startsWith('/api/bookmarks')) {
    return bookmarksHandler(req, res);
  }
  
  if (pathname.startsWith('/api/fetch-feeds')) {
    return fetchFeedsHandler(req, res);
  }
  
  if (pathname.startsWith('/api/visitor-count')) {
    return visitorCountHandler(req, res);
  }
  
  if (pathname.startsWith('/api/user-management')) {
    return userManagementHandler(req, res);
  }
  
  if (pathname.startsWith('/api/user-source-preferences')) {
    return userSourcePreferencesHandler(req, res);
  }
  
  if (pathname.startsWith('/api/vulnerabilities')) {
    return vulnerabilitiesHandler(req, res);
  }
  
  if (pathname.startsWith('/api/fetch-cves')) {
    return fetchCvesHandler(req, res);
  }
  
  if (pathname.startsWith('/api/database')) {
    return databaseHandler(req, res);
  }
  
  if (pathname.startsWith('/api/auth')) {
    return authHandler(req, res);
  }
  
  if (pathname.startsWith('/api/fetch-article')) {
    return fetchArticleHandler(req, res);
  }

  res.status(404).json({ message: 'API endpoint not found' });
}