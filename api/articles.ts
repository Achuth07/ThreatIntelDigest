import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log(`${req.method} /api/articles - Starting request`);
    
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        error: 'DATABASE_URL environment variable is required',
        hasDbUrl: false
      });
    }
    
    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    if (req.method === 'GET') {
      console.log('Fetching articles...');
      const { source, limit = '10', offset = '0', search, sortBy = 'newest' } = req.query;
      
      // Build base query
      let baseQuery = sql`SELECT id, title, summary, url, source, threat_level, tags, read_time, published_at, created_at FROM articles`;
      
      // Add WHERE conditions
      const conditions = [];
      
      if (source && source !== 'all') {
        conditions.push(sql`source = ${source}`);
      }
      
      if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(sql`(title ILIKE ${searchTerm} OR summary ILIKE ${searchTerm})`);
      }
      
      // Combine conditions
      let query = baseQuery;
      if (conditions.length > 0) {
        query = sql`${baseQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
      }
      
      // Add sorting
      if (sortBy === 'newest') {
        query = sql`${query} ORDER BY published_at DESC`;
      } else if (sortBy === 'oldest') {
        query = sql`${query} ORDER BY published_at ASC`;
      } else {
        query = sql`${query} ORDER BY created_at DESC`;
      }
      
      // Add pagination
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      query = sql`${query} LIMIT ${limitNum} OFFSET ${offsetNum}`;
      
      const result = await db.execute(query);
      
      const articles = result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        summary: row.summary,
        url: row.url,
        source: row.source,
        threatLevel: row.threat_level,
        tags: row.tags || [],
        readTime: row.read_time,
        publishedAt: row.published_at,
        createdAt: row.created_at,
        isBookmarked: false // Simplified for now
      }));
      
      console.log(`Successfully fetched ${articles.length} articles`);
      res.json(articles);
      
    } else if (req.method === 'POST') {
      console.log('Creating new article...');
      const { title, summary, url, source, threatLevel = 'LOW', tags = [], readTime = 1 } = req.body;
      
      if (!title || !url || !source) {
        return res.status(400).json({ message: "Title, URL, and source are required" });
      }
      
      const publishedAt = new Date();
      
      const result = await db.execute(sql`
        INSERT INTO articles (title, summary, url, source, threat_level, tags, read_time, published_at)
        VALUES (${title}, ${summary}, ${url}, ${source}, ${threatLevel}, ${tags}, ${readTime}, ${publishedAt})
        RETURNING id, title, summary, url, source, threat_level, tags, read_time, published_at, created_at
      `);
      
      const article = result.rows[0];
      console.log('Successfully created article:', article.id);
      res.status(201).json({
        id: article.id,
        title: article.title,
        summary: article.summary,
        url: article.url,
        source: article.source,
        threatLevel: article.threat_level,
        tags: article.tags || [],
        readTime: article.read_time,
        publishedAt: article.published_at,
        createdAt: article.created_at,
        isBookmarked: false
      });
      
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Fatal error in articles API:', error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error instanceof Error ? error.message : 'Unknown error',
      hasDbUrl: !!process.env.DATABASE_URL,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
    });
  }