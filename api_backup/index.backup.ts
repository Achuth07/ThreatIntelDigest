import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
  
  // Route to appropriate API endpoints
  if (pathname.startsWith('/api/sources')) {
    const { default: sourcesHandler } = await import('./sources');
    return sourcesHandler(req, res);
  }
  
  if (pathname.startsWith('/api/articles')) {
    const { default: articlesHandler } = await import('./articles');
    return articlesHandler(req, res);
  }
  
  if (pathname.startsWith('/api/bookmarks')) {
    const { default: bookmarksHandler } = await import('./bookmarks');
    return bookmarksHandler(req, res);
  }
  
  if (pathname.startsWith('/api/fetch-feeds')) {
    const { default: fetchFeedsHandler } = await import('./fetch-feeds');
    return fetchFeedsHandler(req, res);
  }
  
  if (pathname.startsWith('/api/visitor-count')) {
    const { default: visitorCountHandler } = await import('./visitor-count');
    return visitorCountHandler(req, res);
  }
  
  if (pathname.startsWith('/api/user-management')) {
    const { default: userManagementHandler } = await import('./user-management');
    return userManagementHandler(req, res);
  }
  
  if (pathname.startsWith('/api/user-source-preferences')) {
    const { default: userSourcePreferencesHandler } = await import('./user-source-preferences');
    return userSourcePreferencesHandler(req, res);
  }
  
  if (pathname.startsWith('/api/vulnerabilities')) {
    const { default: vulnerabilitiesHandler } = await import('./vulnerabilities');
    return vulnerabilitiesHandler(req, res);
  }
  
  if (pathname.startsWith('/api/fetch-cves')) {
    const { default: fetchCvesHandler } = await import('./fetch-cves');
    return fetchCvesHandler(req, res);
  }
  
  if (pathname.startsWith('/api/database')) {
    const { default: databaseHandler } = await import('./database');
    return databaseHandler(req, res);
  }
  
  if (pathname.startsWith('/api/auth')) {
    const { default: authHandler } = await import('./auth');
    return authHandler(req, res);
  }
  
  if (pathname.startsWith('/api/fetch-article')) {
    const { default: fetchArticleHandler } = await import('./fetch-article');
    return fetchArticleHandler(req, res);
  }

  res.status(404).json({ message: 'API endpoint not found' });
}