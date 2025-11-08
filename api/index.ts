import type { VercelRequest, VercelResponse } from '@vercel/node';

// Consolidated API handler that handles all endpoints through action-based routing
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
  const action = req.query.action as string || '';
  
  console.log(`API Request: ${req.method} ${pathname} with action: ${action}`);
  
  // Handle different API endpoints based on pathname and action
  try {
    // Auth endpoints
    if (pathname.startsWith('/api/auth')) {
      return handleAuthEndpoints(req, res, action);
    }
    
    // Sources endpoints
    if (pathname.startsWith('/api/sources')) {
      return handleSourcesEndpoints(req, res, action);
    }
    
    // Articles endpoints
    if (pathname.startsWith('/api/articles')) {
      return handleArticlesEndpoints(req, res, action);
    }
    
    // Bookmarks endpoints
    if (pathname.startsWith('/api/bookmarks')) {
      return handleBookmarksEndpoints(req, res, action);
    }
    
    // User management endpoints
    if (pathname.startsWith('/api/user-management')) {
      return handleUserManagementEndpoints(req, res, action);
    }
    
    // User source preferences endpoints
    if (pathname.startsWith('/api/user-source-preferences')) {
      return handleUserSourcePreferencesEndpoints(req, res, action);
    }
    
    // Visitor count endpoints
    if (pathname.startsWith('/api/visitor-count')) {
      return handleVisitorCountEndpoints(req, res, action);
    }
    
    // Vulnerabilities endpoints
    if (pathname.startsWith('/api/vulnerabilities')) {
      return handleVulnerabilitiesEndpoints(req, res, action);
    }
    
    // Fetch CVEs endpoints
    if (pathname.startsWith('/api/fetch-cves')) {
      return handleFetchCvesEndpoints(req, res, action);
    }
    
    // Fetch feeds endpoints
    if (pathname.startsWith('/api/fetch-feeds')) {
      return handleFetchFeedsEndpoints(req, res, action);
    }
    
    // Fetch article endpoints
    if (pathname.startsWith('/api/fetch-article')) {
      return handleFetchArticleEndpoints(req, res, action);
    }
    
    // Database endpoints
    if (pathname.startsWith('/api/database')) {
      return handleDatabaseEndpoints(req, res, action);
    }
    
    // Default 404 response
    res.status(404).json({ message: 'API endpoint not found' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Placeholder functions for each endpoint type
// In a real implementation, these would contain the actual logic from each API file

async function handleAuthEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  res.status(501).json({ message: 'Auth endpoint not implemented in consolidated version' });
}

async function handleSourcesEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  res.status(501).json({ message: 'Sources endpoint not implemented in consolidated version' });
}

async function handleArticlesEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  res.status(501).json({ message: 'Articles endpoint not implemented in consolidated version' });
}

async function handleBookmarksEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  res.status(501).json({ message: 'Bookmarks endpoint not implemented in consolidated version' });
}

async function handleUserManagementEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  res.status(501).json({ message: 'User management endpoint not implemented in consolidated version' });
}

async function handleUserSourcePreferencesEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  res.status(501).json({ message: 'User source preferences endpoint not implemented in consolidated version' });
}

async function handleVisitorCountEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  // Get the origin from the request
  const origin = req.headers.origin || '*';
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.setHeader('Vary', 'Origin'); // Important for CORS with multiple origins

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'POST') {
      // Increment visitor count using CounterAPI v1 (no authentication needed)
      // Added trailing slash to avoid 301 redirect that causes CORS issues
      const counterUrl = `https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed/up/`;
      
      const response = await fetch(counterUrl, {
        method: 'GET'  // CounterAPI v1 uses GET for incrementing
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`CounterAPI v1 increment failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`CounterAPI v1 increment failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      res.status(200).json(data);
    } else if (req.method === 'GET') {
      // Get visitor count using CounterAPI v1 (no authentication needed)
      // Added trailing slash to avoid 301 redirect that causes CORS issues
      const counterUrl = `https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed/`;
      
      const response = await fetch(counterUrl, {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`CounterAPI v1 fetch failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`CounterAPI v1 fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      res.status(200).json(data);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Visitor count API error:', error);
    res.status(500).json({ error: 'Failed to process visitor count request', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}

async function handleVulnerabilitiesEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  res.status(501).json({ message: 'Vulnerabilities endpoint not implemented in consolidated version' });
}

async function handleFetchCvesEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  res.status(501).json({ message: 'Fetch CVEs endpoint not implemented in consolidated version' });
}

async function handleFetchFeedsEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  res.status(501).json({ message: 'Fetch feeds endpoint not implemented in consolidated version' });
}

async function handleFetchArticleEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ message: 'URL parameter is required' });
  }

  try {
    // Import required modules dynamically
    const { default: axios } = await import('axios');
    const { JSDOM } = await import('jsdom');
    const { Readability } = await import('@mozilla/readability');
    
    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ message: 'Invalid URL format' });
    }

    // Fetch the article HTML with a realistic User-Agent
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000, // 15 second timeout
      maxRedirects: 5,
    });

    if (!response.data) {
      return res.status(404).json({ message: 'No content found at the provided URL' });
    }

    // Parse HTML with JSDOM
    const dom = new JSDOM(response.data, {
      url: url,
    });

    // Use Readability to extract the main content
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return res.status(422).json({ 
        message: 'Unable to extract readable content from this article. The page may not contain article content or may be behind a paywall.' 
      });
    }

    // Clean up the DOM
    dom.window.close();

    // Return the parsed article content
    res.json({
      title: article.title,
      content: article.content,
      textContent: article.textContent,
      length: article.length,
      excerpt: article.excerpt,
      byline: article.byline,
      dir: article.dir,
      siteName: article.siteName,
      lang: article.lang,
    });

  } catch (error) {
    console.error('Error fetching article:', error);

    // Import axios dynamically to check for axios errors
    const { default: axios } = await import('axios');
    
    // Handle specific error types
    if (axios.isAxiosError(error)) {
      if (error.code === 'ENOTFOUND') {
        return res.status(404).json({ message: 'Article URL not found' });
      }
      if (error.code === 'ECONNABORTED') {
        return res.status(408).json({ message: 'Request timeout - the article took too long to load' });
      }
      if (error.response?.status === 403) {
        return res.status(403).json({ message: 'Access denied - the website may be blocking automated requests' });
      }
      if (error.response?.status === 404) {
        return res.status(404).json({ message: 'Article not found at the provided URL' });
      }
      if (error.response?.status === 429) {
        return res.status(429).json({ message: 'Rate limited - too many requests to this website' });
      }
      if (error.response?.status && error.response.status >= 500) {
        return res.status(502).json({ message: 'The article website is currently unavailable' });
      }
    }

    // Generic error response
    res.status(500).json({ 
      message: 'Failed to fetch article content. Please check the URL and try again.' 
    });
  }
}

async function handleDatabaseEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  res.status(501).json({ message: 'Database endpoint not implemented in consolidated version' });
}