import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    
    // Count articles
    const articleCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM articles`);
    const articleCount = articleCountResult.rows[0]?.count || 0;
    
    // Count sources
    const sourceCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM rss_sources WHERE is_active = true`);
    const sourceCount = sourceCountResult.rows[0]?.count || 0;
    
    // Get sample articles
    const samplesResult = await db.execute(sql`
      SELECT id, title, source, published_at, created_at 
      FROM articles 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    res.json({
      success: true,
      articleCount: Number(articleCount),
      activeSourceCount: Number(sourceCount),
      sampleArticles: samplesResult.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        source: row.source,
        publishedAt: row.published_at,
        createdAt: row.created_at
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database check failed:', error);
    
    res.status(500).json({
      error: 'Database check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}