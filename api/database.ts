import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  switch (action) {
    case 'ping':
      return handlePing(req, res);
    case 'check':
      return handleCheckDb(req, res);
    case 'init':
      return handleInitDb(req, res);
    case 'test':
      return handleTestDb(req, res);
    case 'test-steps':
      return handleTestDbSteps(req, res);
    case 'initialize-sources':
      return handleInitializeSources(req, res);
    default:
      return res.status(400).json({ 
        error: 'Invalid action', 
        availableActions: ['ping', 'check', 'init', 'test', 'test-steps', 'initialize-sources']
      });
  }
}

// Ping functionality
async function handlePing(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  res.json({ 
    message: 'API is working!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}

// Check database functionality
async function handleCheckDb(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Starting database check...');
    
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        error: 'DATABASE_URL environment variable is required'
      });
    }
    
    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    // Test basic connectivity
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    const currentTime = result.rows[0]?.current_time;
    
    // Check table existence
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('articles', 'bookmarks', 'rss_sources', 'vulnerabilities')
      ORDER BY table_name
    `);
    
    const existingTables = tableCheck.rows.map(row => row.table_name);
    const expectedTables = ['articles', 'bookmarks', 'rss_sources', 'vulnerabilities'];
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    // Count records in each existing table
    const tableCounts: Record<string, number> = {};
    for (const table of existingTables) {
      try {
        const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
        tableCounts[table as string] = parseInt(countResult.rows[0]?.count as string || '0');
      } catch (error) {
        tableCounts[table as string] = -1; // Error counting
      }
    }
    
    res.json({
      status: 'success',
      database: {
        connected: true,
        currentTime,
        url: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'hidden'}` : null
      },
      tables: {
        existing: existingTables,
        missing: missingTables,
        counts: tableCounts
      },
      recommendations: missingTables.length > 0 ? [
        'Run database initialization to create missing tables',
        'Check that your database schema is up to date'
      ] : [
        'Database appears to be properly configured'
      ]
    });
    
  } catch (error) {
    console.error("Database check failed:", error);
    res.status(500).json({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error',
      database: {
        connected: false
      }
    });
  }
}

// Initialize database functionality
async function handleInitDb(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Starting database initialization...');
    
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        error: 'DATABASE_URL environment variable is required'
      });
    }
    
    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    console.log('Creating tables...');
    
    // Create articles table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        summary TEXT,
        url TEXT NOT NULL UNIQUE,
        source TEXT NOT NULL,
        source_icon TEXT,
        published_at TIMESTAMP WITH TIME ZONE NOT NULL,
        threat_level TEXT NOT NULL DEFAULT 'MEDIUM',
        tags TEXT[] DEFAULT '{}',
        read_time INTEGER DEFAULT 5,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('Articles table created/verified');
    
    // Create bookmarks table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('Bookmarks table created/verified');
    
    // Create rss_sources table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rss_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        url TEXT NOT NULL UNIQUE,
        icon TEXT,
        color TEXT,
        is_active BOOLEAN DEFAULT true,
        last_fetched TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log('RSS sources table created/verified');
    
    // Create vulnerabilities table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vulnerabilities (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        published_date TIMESTAMP WITH TIME ZONE NOT NULL,
        last_modified_date TIMESTAMP WITH TIME ZONE NOT NULL,
        vuln_status TEXT NOT NULL,
        cvss_v3_score TEXT,
        cvss_v3_severity TEXT,
        cvss_v2_score TEXT,
        cvss_v2_severity TEXT,
        weaknesses TEXT[] DEFAULT '{}',
        reference_urls JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('Vulnerabilities table created/verified');
    
    // Create indexes for better performance
    console.log('Creating indexes...');
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_articles_threat_level ON articles(threat_level)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bookmarks_article_id ON bookmarks(article_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(cvss_v3_severity)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_vulnerabilities_modified ON vulnerabilities(last_modified_date DESC)
    `);
    
    console.log('Database initialization completed successfully');
    
    res.json({
      message: 'Database initialized successfully',
      tables: ['articles', 'bookmarks', 'rss_sources', 'vulnerabilities'],
      indexes: [
        'idx_articles_source',
        'idx_articles_published_at', 
        'idx_articles_threat_level',
        'idx_bookmarks_article_id',
        'idx_vulnerabilities_severity',
        'idx_vulnerabilities_modified'
      ],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Database initialization failed:", error);
    res.status(500).json({ 
      message: "Failed to initialize database",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Test database functionality
async function handleTestDb(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        error: 'DATABASE_URL environment variable is required'
      });
    }
    
    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    // Test database connection
    const result = await db.execute(sql`SELECT 'Database connection successful' as message, NOW() as timestamp`);
    
    res.json({
      status: 'success',
      message: result.rows[0]?.message,
      timestamp: result.rows[0]?.timestamp,
      database_url_configured: !!process.env.DATABASE_URL
    });
    
  } catch (error) {
    console.error("Database test failed:", error);
    res.status(500).json({ 
      status: 'error',
      message: "Database connection failed",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Test database steps functionality
async function handleTestDbSteps(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const steps: Array<{ step: string; status: string; message?: string; error?: string }> = [];

  try {
    // Step 1: Check environment variable
    steps.push({
      step: 'Environment Check',
      status: process.env.DATABASE_URL ? 'success' : 'failed',
      message: process.env.DATABASE_URL ? 'DATABASE_URL is configured' : 'DATABASE_URL is missing'
    });

    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ steps });
    }

    // Step 2: Import modules
    try {
      await import('drizzle-orm/neon-serverless');
      await import('@neondatabase/serverless');
      await import('drizzle-orm');
      steps.push({
        step: 'Module Import',
        status: 'success',
        message: 'All required modules imported successfully'
      });
    } catch (error) {
      steps.push({
        step: 'Module Import',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return res.status(500).json({ steps });
    }

    // Step 3: Create connection
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    steps.push({
      step: 'Connection Setup',
      status: 'success',
      message: 'Database connection pool created'
    });

    // Step 4: Test query
    try {
      const result = await db.execute(sql`SELECT NOW() as current_time, version() as db_version`);
      steps.push({
        step: 'Database Query',
        status: 'success',
        message: `Query successful at ${result.rows[0]?.current_time}`
      });
    } catch (error) {
      steps.push({
        step: 'Database Query',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return res.status(500).json({ steps });
    }

    res.json({ 
      status: 'success',
      message: 'All database tests passed',
      steps 
    });
    
  } catch (error) {
    steps.push({
      step: 'Unexpected Error',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({ 
      status: 'error',
      message: 'Database test failed',
      steps 
    });
  }
}

// Initialize sources functionality
async function handleInitializeSources(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        error: 'DATABASE_URL environment variable is required'
      });
    }
    
    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    const defaultSources = [
      {
        name: "Bleeping Computer",
        url: "https://www.bleepingcomputer.com/feed/",
        icon: "fas fa-exclamation",
        color: "#ef4444"
      },
      {
        name: "The Hacker News",
        url: "https://feeds.feedburner.com/TheHackersNews",
        icon: "fas fa-user-secret",
        color: "#f97316"
      },
      {
        name: "Dark Reading",
        url: "https://www.darkreading.com/rss_simple.asp",
        icon: "fas fa-eye",
        color: "#8b5cf6"
      },
      {
        name: "CrowdStrike Blog",
        url: "https://www.crowdstrike.com/blog/feed/",
        icon: "fas fa-crow",
        color: "#dc2626"
      },
      {
        name: "Unit 42",
        url: "https://unit42.paloaltonetworks.com/feed/",
        icon: "fas fa-shield-virus",
        color: "#2563eb"
      },
      {
        name: "The DFIR Report",
        url: "https://thedfirreport.com/feed/",
        icon: "fas fa-search",
        color: "#16a34a"
      }
    ];

    let insertedCount = 0;
    const errors: string[] = [];

    for (const source of defaultSources) {
      try {
        await db.execute(sql`
          INSERT INTO rss_sources (name, url, icon, color, is_active)
          VALUES (${source.name}, ${source.url}, ${source.icon}, ${source.color}, true)
          ON CONFLICT (name) DO NOTHING
        `);
        insertedCount++;
      } catch (error) {
        errors.push(`Failed to insert ${source.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    res.json({
      message: `Successfully initialized ${insertedCount} RSS sources`,
      sourcesInitialized: insertedCount,
      totalSources: defaultSources.length,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error("Error initializing sources:", error);
    res.status(500).json({ 
      message: "Failed to initialize RSS sources",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}