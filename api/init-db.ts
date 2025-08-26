import type { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import * as schema from '../shared/schema';

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

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });

    // Create tables if they don't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rss_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL UNIQUE,
        icon VARCHAR(100),
        color VARCHAR(7),
        is_active BOOLEAN DEFAULT true,
        last_fetched TIMESTAMP
      );
    `);

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
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Database schema initialized successfully');

    // Now add default sources
    const defaultSources = [
      {
        name: "Bleeping Computer",
        url: "https://www.bleepingcomputer.com/feed/",
        icon: "fas fa-exclamation",
        color: "#ef4444",
        isActive: true,
      },
      {
        name: "The Hacker News",
        url: "https://feeds.feedburner.com/TheHackersNews",
        icon: "fas fa-user-secret",
        color: "#f97316",
        isActive: true,
      },
      {
        name: "Dark Reading",
        url: "https://www.darkreading.com/rss_simple.asp",
        icon: "fas fa-eye",
        color: "#8b5cf6",
        isActive: true,
      },
      {
        name: "CrowdStrike Blog",
        url: "https://www.crowdstrike.com/blog/feed/",
        icon: "fas fa-crow",
        color: "#dc2626",
        isActive: true,
      },
      {
        name: "Unit 42",
        url: "https://unit42.paloaltonetworks.com/feed/",
        icon: "fas fa-shield-virus",
        color: "#2563eb",
        isActive: true,
      },
      {
        name: "The DFIR Report",
        url: "https://thedfirreport.com/feed/",
        icon: "fas fa-search",
        color: "#16a34a",
        isActive: true,
      },
    ];

    let sourcesAdded = 0;
    for (const source of defaultSources) {
      try {
        await db.execute(sql`
          INSERT INTO rss_sources (name, url, icon, color, is_active) 
          VALUES (${source.name}, ${source.url}, ${source.icon}, ${source.color}, ${source.isActive})
          ON CONFLICT (url) DO NOTHING
        `);
        sourcesAdded++;
      } catch (error) {
        console.log(`Source ${source.name} already exists or failed to insert`);
      }
    }

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
      timestamp: new Date().toISOString()
    });
  }
}