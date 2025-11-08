import type { VercelRequest, VercelResponse } from '@vercel/node';

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
function getUserIdFromRequest(req: VercelRequest): number | null {
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
    name: 'The Hacker News',
    url: 'https://feeds.feedburner.com/TheHackersNews',
    icon: 'fas fa-user-secret',
    color: '#f97316',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Dark Reading',
    url: 'https://www.darkreading.com/rss_simple.asp',
    icon: 'fas fa-eye',
    color: '#8b5cf6',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  // Updated Cisco Talos Intelligence URL
  {
    id: '4',
    name: 'Cisco Talos Intelligence',
    url: 'https://feeds.feedburner.com/feedburner/Talos',
    icon: 'fas fa-network-wired',
    color: '#1ba0d7',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  // New sources
  {
    id: '5',
    name: 'Cisco Threat Research Blog',
    url: 'https://blogs.cisco.com/feed',
    icon: 'fas fa-network-wired',
    color: '#1ba0d7',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  {
    id: '6',
    name: 'Check Point Research',
    url: 'https://research.checkpoint.com/category/threat-research/feed/',
    icon: 'fas fa-shield-alt',
    color: '#4285f4',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  // Moved from Government & Agency Alerts to Vendor & Private Threat Research
  {
    id: '7',
    name: 'Juniper Networks Threat Research',
    url: 'https://blogs.juniper.net/threat-research/feed',
    icon: 'fas fa-network-wired',
    color: '#1ba0d7',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  // Additional important sources
  {
    id: '8',
    name: 'Krebs on Security',
    url: 'https://krebsonsecurity.com/feed/',
    icon: 'fas fa-user-tie',
    color: '#059669',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  {
    id: '9',
    name: 'US-Cert (Current Activity)',
    url: 'https://us-cert.cisa.gov/ncas/current-activity.xml',
    icon: 'fas fa-flag-usa',
    color: '#1e40af',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  {
    id: '10',
    name: 'Google Project Zero',
    url: 'https://googleprojectzero.blogspot.com/feeds/posts/default',
    icon: 'fas fa-google',
    color: '#4285f4',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  {
    id: '11',
    name: 'Microsoft Security Blog',
    url: 'https://www.microsoft.com/en-us/security/blog/feed/',
    icon: 'fas fa-microsoft',
    color: '#00bcf2',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  {
    id: '12',
    name: 'CrowdStrike Blog',
    url: 'https://www.crowdstrike.com/blog/feed/',
    icon: 'fas fa-crow',
    color: '#dc2626',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  // Moved from Legacy category
  {
    id: '13',
    name: 'Flashpoint',
    url: 'https://flashpoint.io/feed/',
    icon: 'fas fa-flash',
    color: '#f59e0b',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
];

// In-memory storage for user source preferences (local development)
let inMemoryUserPreferences: any[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
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