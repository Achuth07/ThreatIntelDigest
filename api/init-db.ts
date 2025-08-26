import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed. Use POST to initialize schema.' });
  }

  try {
    console.log('Initializing database schema...');
    
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        error: 'DATABASE_URL environment variable is not set'
      });
    }

    // Import modules dynamically to avoid module loading issues
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    console.log('Creating rss_sources table...');
    // Create rss_sources table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rss_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL UNIQUE,
        icon VARCHAR(100),
        color VARCHAR(7),
        is_active BOOLEAN DEFAULT true,
        last_fetched TIMESTAMP
      )
    `);

    console.log('Creating articles table...');
    // Create articles table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        summary TEXT,
        url TEXT NOT NULL UNIQUE,
        source VARCHAR(255) NOT NULL,
        threat_level VARCHAR(20) DEFAULT 'LOW',
        tags TEXT[],
        read_time INTEGER,
        published_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Creating bookmarks table...');
    // Create bookmarks table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Database schema created successfully');

    // Add default sources using individual INSERT statements
    const defaultSources = [
      ['Bleeping Computer', 'https://www.bleepingcomputer.com/feed/', 'fas fa-exclamation', '#ef4444'],
      ['The Hacker News', 'https://feeds.feedburner.com/TheHackersNews', 'fas fa-user-secret', '#f97316'],
      ['Dark Reading', 'https://www.darkreading.com/rss_simple.asp', 'fas fa-eye', '#8b5cf6'],
      ['CrowdStrike Blog', 'https://www.crowdstrike.com/blog/feed/', 'fas fa-crow', '#dc2626'],
      ['Unit 42', 'https://unit42.paloaltonetworks.com/feed/', 'fas fa-shield-virus', '#2563eb'],
      ['The DFIR Report', 'https://thedfirreport.com/feed/', 'fas fa-search', '#16a34a']
    ];

    let sourcesAdded = 0;
    console.log('Adding default sources...');
    
    for (const [name, url, icon, color] of defaultSources) {
      try {
        await db.execute(
          sql`INSERT INTO rss_sources (name, url, icon, color, is_active) 
              VALUES (${name}, ${url}, ${icon}, ${color}, true)
              ON CONFLICT (url) DO NOTHING`
        );
        sourcesAdded++;
        console.log(`Added source: ${name}`);
      } catch (error) {
        console.log(`Source ${name} already exists or failed to insert:`, error);
      }
    }

    console.log(`Initialization complete. Added ${sourcesAdded} sources.`);

    res.json({
      success: true,
      message: 'Database schema and default sources initialized successfully',
      sourcesAdded,
      totalSources: defaultSources.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database initialization failed:', error);
    
    res.status(500).json({
      error: 'Database initialization failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
      timestamp: new Date().toISOString()
    });
  }
}