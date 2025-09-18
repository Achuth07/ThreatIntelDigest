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

  res.status(404).json({ message: 'API endpoint not found' });
}