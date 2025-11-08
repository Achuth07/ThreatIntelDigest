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

// In-memory storage for local development
let inMemorySources: any[] = [
  {
    id: '1',
    name: 'Bleeping Computer',
    url: 'https://www.bleepingcomputer.com/feed/',
    icon: 'fas fa-exclamation',
    color: '#ef4444',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Microsoft Security Blog',
    url: 'https://www.microsoft.com/en-us/security/blog/feed/',
    icon: 'fas fa-microsoft',
    color: '#00bcf2',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  {
    id: '3',
    name: 'The DFIR Report',
    url: 'https://thedfirreport.com/feed/',
    icon: 'fas fa-file-alt',
    color: '#8b5cf6',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Unit 42',
    url: 'https://unit42.paloaltonetworks.com/feed/',
    icon: 'fas fa-shield-alt',
    color: '#f97316',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  {
    id: '5',
    name: 'The Hacker News',
    url: 'https://feeds.feedburner.com/TheHackersNews',
    icon: 'fas fa-user-secret',
    color: '#ef4444',
    isActive: true,
    lastFetched: new Date().toISOString()
  }
];

// In-memory storage for user source preferences (local development)
let inMemoryUserPreferences: any[] = [];

// Helper function to verify token
function verifyToken(token: string): any | null {
  try {
    // Basic format check
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const [encodedHeader, encodedPayload, signature] = parts;
    const secret = process.env.SESSION_SECRET || 'fallback_secret_key_for_development_only';
    
    // Decode payload
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString());
    
    // Check if token has expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && currentTime > payload.exp) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Helper function to get user ID from request
function getUserIdFromRequest(req: any): number | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const payload = verifyToken(token);
  
  if (!payload || !payload.userId) {
    return null;
  }
  
  return payload.userId;
}

async function handleAuthEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  res.status(501).json({ message: 'Auth endpoint not implemented in consolidated version' });
}

async function handleSourcesEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  try {
    console.log(`${req.method} /api/sources - Starting request`);
    
    // Use in-memory storage when no DATABASE_URL is provided
    if (!process.env.DATABASE_URL) {
      console.log('Using in-memory storage for sources');
      
      if (req.method === 'GET') {
        console.log('Fetching RSS sources from memory...');
        
        // Get user ID from request for user-specific sources
        const userId = getUserIdFromRequest(req);
        
        if (userId) {
          // For in-memory storage, we'll need to implement user preferences
          // This is a simplified implementation for development only
          const userPreferences = inMemoryUserPreferences.filter(p => p.userId === userId);
          
          const sources = inMemorySources.filter(source => source.isActive).map(source => {
            const userPref = userPreferences.find(p => p.sourceId === source.id);
            return {
              ...source,
              isActive: userPref ? userPref.isActive : true // Default to active if no preference
            };
          });
          
          console.log(`Successfully fetched ${sources.length} user-specific sources`);
          return res.json(sources);
        } else {
          // Fetch all active sources for unauthenticated users
          const sources = inMemorySources.filter(source => source.isActive);
          console.log(`Successfully fetched ${sources.length} sources`);
          return res.json(sources);
        }
        
      } else if (req.method === 'POST') {
        console.log('Creating new RSS source in memory...');
        const { name, url, icon, color, isActive = true } = req.body;
        
        if (!name || !url) {
          return res.status(400).json({ message: "Name and URL are required" });
        }
        
        const newSource = {
          id: String(inMemorySources.length + 1),
          name,
          url,
          icon: icon || null,
          color: color || null,
          isActive,
          lastFetched: new Date().toISOString()
        };
        
        inMemorySources.push(newSource);
        console.log('Successfully created RSS source:', newSource.id);
        return res.status(201).json(newSource);
        
      } else if (req.method === 'PATCH') {
        console.log('Updating RSS source in memory...');
        
        // Handle both path parameter and query parameter for source ID
        const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
        let sourceId = pathname.split('/').pop();
        
        // If no source ID in path, check query parameters
        if (!sourceId || sourceId === 'sources') {
          sourceId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
        }
        
        if (!sourceId) {
          return res.status(400).json({ message: "Source ID is required" });
        }
        
        const sourceIndex = inMemorySources.findIndex(source => source.id === sourceId);
        if (sourceIndex === -1) {
          return res.status(404).json({ message: "Source not found" });
        }
        
        const { isActive, name, url, icon, color } = req.body;
        
        // Update the source
        if (name !== undefined) inMemorySources[sourceIndex].name = name;
        if (url !== undefined) inMemorySources[sourceIndex].url = url;
        if (icon !== undefined) inMemorySources[sourceIndex].icon = icon;
        if (color !== undefined) inMemorySources[sourceIndex].color = color;
        if (isActive !== undefined) inMemorySources[sourceIndex].isActive = isActive;
        
        console.log('Successfully updated RSS source:', sourceId);
        return res.json(inMemorySources[sourceIndex]);
        
      } else if (req.method === 'DELETE') {
        console.log('Deleting RSS source from memory...');
        const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
        const sourceId = pathname.split('/').pop();
        
        if (!sourceId) {
          return res.status(400).json({ message: "Source ID is required" });
        }
        
        const sourceIndex = inMemorySources.findIndex(source => source.id === sourceId);
        if (sourceIndex === -1) {
          return res.status(404).json({ message: "Source not found" });
        }
        
        inMemorySources.splice(sourceIndex, 1);
        console.log('Successfully deleted RSS source:', sourceId);
        return res.status(204).send('');
        
      } else {
        return res.status(405).json({ message: 'Method not allowed' });
      }
    }
    
    // Import modules dynamically to avoid module loading issues
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    if (req.method === 'GET') {
      console.log('Fetching RSS sources...');
      
      // Get user ID from request for user-specific sources
      const userId = getUserIdFromRequest(req);
      
      if (userId) {
        // Fetch user-specific sources
        const result = await db.execute(sql`
          SELECT s.id, s.name, s.url, s.icon, s.color, s.is_active, s.last_fetched,
                 p.is_active as user_active
          FROM rss_sources s
          LEFT JOIN user_source_preferences p ON s.id = p.source_id AND p.user_id = ${userId}
          WHERE s.is_active = true
          ORDER BY s.name ASC
        `);
        
        const sources = result.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          url: row.url,
          icon: row.icon,
          color: row.color,
          isActive: row.user_active !== null ? row.user_active : true, // Default to active if no preference
          lastFetched: row.last_fetched
        }));
        
        console.log(`Successfully fetched ${sources.length} user-specific sources`);
        res.json(sources);
      } else {
        // Fetch all active sources for unauthenticated users
        const result = await db.execute(sql`
          SELECT id, name, url, icon, color, is_active, last_fetched
          FROM rss_sources 
          WHERE is_active = true
          ORDER BY name ASC
        `);
        
        const sources = result.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          url: row.url,
          icon: row.icon,
          color: row.color,
          isActive: row.is_active,
          lastFetched: row.last_fetched
        }));
        
        console.log(`Successfully fetched ${sources.length} sources`);
        res.json(sources);
      }
      
    } else if (req.method === 'POST') {
      console.log('Creating new RSS source...');
      const { name, url, icon, color, isActive = true } = req.body;
      
      if (!name || !url) {
        return res.status(400).json({ message: "Name and URL are required" });
      }
      
      const result = await db.execute(sql`
        INSERT INTO rss_sources (name, url, icon, color, is_active) 
        VALUES (${name}, ${url}, ${icon || null}, ${color || null}, ${isActive})
        RETURNING id, name, url, icon, color, is_active, last_fetched
      `);
      
      const source = result.rows[0];
      console.log('Successfully created RSS source:', source.id);
      res.status(201).json({
        id: source.id,
        name: source.name,
        url: source.url,
        icon: source.icon,
        color: source.color,
        isActive: source.is_active,
        lastFetched: source.last_fetched
      });
      
    } else if (req.method === 'PATCH') {
      console.log('Updating RSS source...');
      
      // Handle both path parameter and query parameter for source ID
      // This fixes the Vercel routing issue where path parameters aren't always available
      const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
      let sourceId = pathname.split('/').pop();
      
      // If no source ID in path, check query parameters
      if (!sourceId || sourceId === 'sources') {
        sourceId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
      }
      
      if (!sourceId) {
        return res.status(400).json({ message: "Source ID is required" });
      }
      
      const { isActive, name, url, icon, color } = req.body;
      
      // For now, just handle isActive field (most common use case)
      if (isActive !== undefined) {
        const result = await db.execute(sql`
          UPDATE rss_sources 
          SET is_active = ${isActive}
          WHERE id = ${sourceId}
          RETURNING id, name, url, icon, color, is_active, last_fetched
        `);
        
        if (result.rows.length === 0) {
          return res.status(404).json({ message: "Source not found" });
        }
        
        const source = result.rows[0];
        console.log('Successfully updated RSS source:', sourceId);
        res.json({
          id: source.id,
          name: source.name,
          url: source.url,
          icon: source.icon,
          color: source.color,
          isActive: source.is_active,
          lastFetched: source.last_fetched
        });
      } else {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
    } else if (req.method === 'DELETE') {
      console.log('Deleting RSS source...');
      const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
      const sourceId = pathname.split('/').pop();
      
      if (!sourceId) {
        return res.status(400).json({ message: "Source ID is required" });
      }
      
      const result = await db.execute(sql`
        DELETE FROM rss_sources WHERE id = ${sourceId}
        RETURNING id
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Source not found" });
      }
      
      console.log('Successfully deleted RSS source:', sourceId);
      res.status(204).send('');
      
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Fatal error in sources API:', error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error instanceof Error ? error.message : 'Unknown error',
      hasDbUrl: !!process.env.DATABASE_URL,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
    });
  }
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

// Simplified user source preferences storage implementation
class SimpleUserSourcePreferenceStorage {
  // In-memory storage for local development
  private inMemoryPreferences: any[] = [];
  
  async getUserSourcePreferences(userId: number): Promise<any[]> {
    if (!process.env.DATABASE_URL) {
      // Return in-memory preferences filtered by userId
      return this.inMemoryPreferences.filter(p => p.userId === userId);
    }
    
    // For Vercel, we'll need to import modules dynamically
    try {
      const { drizzle } = await import('drizzle-orm/neon-serverless');
      const { Pool } = await import('@neondatabase/serverless');
      const { sql } = await import('drizzle-orm');
      
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle(pool);
      
      // Query user_source_preferences table
      const result = await db.execute(sql`
        SELECT id, user_id, source_id, is_active, created_at, updated_at
        FROM user_source_preferences 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        sourceId: row.source_id,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error fetching user source preferences:', error);
      return [];
    }
  }
  
  async createUserSourcePreference(data: { userId: number; sourceId: string; isActive?: boolean }): Promise<any> {
    if (!process.env.DATABASE_URL) {
      // Create in-memory preference
      const newPreference = {
        ...data,
        id: String(this.inMemoryPreferences.length + 1),
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.inMemoryPreferences.push(newPreference);
      return newPreference;
    }
    
    // For Vercel, we'll need to import modules dynamically
    try {
      const { drizzle } = await import('drizzle-orm/neon-serverless');
      const { Pool } = await import('@neondatabase/serverless');
      const { sql } = await import('drizzle-orm');
      
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle(pool);
      
      // Check if preference already exists
      const existingResult = await db.execute(sql`
        SELECT id FROM user_source_preferences 
        WHERE user_id = ${data.userId} AND source_id = ${data.sourceId}
        LIMIT 1
      `);
      
      // If preference already exists, update it
      if (existingResult.rows.length > 0) {
        const existingRow = existingResult.rows[0];
        const result = await db.execute(sql`
          UPDATE user_source_preferences 
          SET is_active = ${data.isActive !== undefined ? data.isActive : true}, updated_at = NOW()
          WHERE id = ${existingRow.id}
          RETURNING id, user_id, source_id, is_active, created_at, updated_at
        `);
        
        const updatedRow = result.rows[0];
        return {
          id: updatedRow.id,
          userId: updatedRow.user_id,
          sourceId: updatedRow.source_id,
          isActive: updatedRow.is_active,
          createdAt: updatedRow.created_at,
          updatedAt: updatedRow.updated_at
        };
      }
      
      // Insert new preference
      const result = await db.execute(sql`
        INSERT INTO user_source_preferences (user_id, source_id, is_active)
        VALUES (${data.userId}, ${data.sourceId}, ${data.isActive !== undefined ? data.isActive : true})
        RETURNING id, user_id, source_id, is_active, created_at, updated_at
      `);
      
      const insertedRow = result.rows[0];
      return {
        id: insertedRow.id,
        userId: insertedRow.user_id,
        sourceId: insertedRow.source_id,
        isActive: insertedRow.is_active,
        createdAt: insertedRow.created_at,
        updatedAt: insertedRow.updated_at
      };
    } catch (error) {
      console.error('Error creating user source preference:', error);
      throw error;
    }
  }
  
  async deleteUserSourcePreference(userId: number, sourceId: string): Promise<boolean> {
    if (!process.env.DATABASE_URL) {
      // Delete from in-memory storage
      const index = this.inMemoryPreferences.findIndex(p => p.userId === userId && p.sourceId === sourceId);
      if (index !== -1) {
        this.inMemoryPreferences.splice(index, 1);
        return true;
      }
      return false;
    }
    
    // For Vercel, we'll need to import modules dynamically
    try {
      const { drizzle } = await import('drizzle-orm/neon-serverless');
      const { Pool } = await import('@neondatabase/serverless');
      const { sql } = await import('drizzle-orm');
      
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle(pool);
      
      const result = await db.execute(sql`
        DELETE FROM user_source_preferences 
        WHERE user_id = ${userId} AND source_id = ${sourceId}
      `);
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting user source preference:', error);
      return false;
    }
  }
}

async function handleUserSourcePreferencesEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  console.log(`User Source Preferences API ${req.method} ${req.url}`);
  
  // Get user ID from request (for authenticated endpoints)
  const userId = getUserIdFromRequest(req);
  
  // Require authentication for all endpoints
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // Create storage instance
  const storage = new SimpleUserSourcePreferenceStorage();
  
  if (req.method === 'GET') {
    try {
      const preferences = await storage.getUserSourcePreferences(userId);
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user source preferences" });
    }
  } else if (req.method === 'POST') {
    try {
      const { sourceId, isActive } = req.body;
      if (!sourceId) {
        return res.status(400).json({ message: "Source ID is required" });
      }
      
      const preference = await storage.createUserSourcePreference({ userId, sourceId, isActive });
      res.status(201).json(preference);
    } catch (error) {
      res.status(400).json({ message: "Invalid preference data" });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Parse the source ID from query parameters
      let sourceId: string | undefined;
      
      // First check query parameters
      if (req.query && req.query.sourceId) {
        sourceId = req.query.sourceId as string;
      }
      
      if (!sourceId) {
        return res.status(400).json({ message: "Source ID is required" });
      }
      
      const result = await storage.deleteUserSourcePreference(userId, sourceId);
      if (result) {
        res.status(204).send('');
      } else {
        res.status(404).json({ message: "Preference not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user source preference" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
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