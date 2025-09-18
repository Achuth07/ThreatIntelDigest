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
  
  // Handle CounterAPI proxy endpoints
  if (pathname === '/api/counter') {
    if (req.method === 'GET') {
      try {
        // Proxy request to CounterAPI
        const counterResponse = await fetch('https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed');
        
        if (counterResponse.ok) {
          const data = await counterResponse.json();
          return res.status(200).json(data);
        } else {
          const errorText = await counterResponse.text();
          return res.status(counterResponse.status).json({ 
            error: `CounterAPI error: ${counterResponse.status}`,
            details: errorText
          });
        }
      } catch (error) {
        console.error('CounterAPI proxy error:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch counter data',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  }
  
  if (pathname === '/api/counter/increment') {
    if (req.method === 'POST') {
      try {
        // Proxy increment request to CounterAPI
        const counterResponse = await fetch('https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed/up', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (counterResponse.ok) {
          const data = await counterResponse.json();
          return res.status(200).json(data);
        } else {
          const errorText = await counterResponse.text();
          return res.status(counterResponse.status).json({ 
            error: `CounterAPI error: ${counterResponse.status}`,
            details: errorText
          });
        }
      } catch (error) {
        console.error('CounterAPI proxy increment error:', error);
        return res.status(500).json({ 
          error: 'Failed to increment counter',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  }

  res.status(404).json({ message: 'API endpoint not found' });
}