import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory storage for local development
let inMemoryArticles: any[] = [
  {
    id: '1',
    title: 'New Zero-Day Exploit Targets Popular Web Browsers',
    summary: 'Security researchers have discovered a critical zero-day vulnerability affecting major web browsers that could allow remote code execution.',
    url: 'https://example.com/article1',
    source: 'Bleeping Computer',
    threatLevel: 'HIGH',
    tags: ['browser', 'zero-day', 'exploit'],
    readTime: 5,
    publishedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '2',
    title: 'Ransomware Group Claims Responsibility for Healthcare Data Breach',
    summary: 'A notorious ransomware gang has announced they breached a major healthcare provider and are demanding payment.',
    url: 'https://example.com/article2',
    source: 'The Hacker News',
    threatLevel: 'CRITICAL',
    tags: ['ransomware', 'healthcare', 'breach'],
    readTime: 8,
    publishedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: '3',
    title: 'New Phishing Campaign Targets Financial Institutions',
    summary: 'Cybercriminals are using sophisticated techniques to bypass email security filters and target banking customers.',
    url: 'https://example.com/article3',
    source: 'Dark Reading',
    threatLevel: 'MEDIUM',
    tags: ['phishing', 'finance', 'email'],
    readTime: 4,
    publishedAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    createdAt: new Date(Date.now() - 10800000).toISOString()
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log(`${req.method} /api/articles - Starting request`);
    
    // Use in-memory storage when no DATABASE_URL is provided
    if (!process.env.DATABASE_URL) {
      console.log('Using in-memory storage for articles');
      
      if (req.method === 'GET') {
        console.log('Fetching articles from memory...');
        const { source, limit = '10', offset = '0', search, sortBy = 'newest' } = req.query;
        
        // Filter by source if provided
        let filteredArticles = [...inMemoryArticles];
        if (source && source !== 'all') {
          filteredArticles = filteredArticles.filter(article => article.source === source);
        }
        
        // Filter by search term if provided
        if (search) {
          const searchTerm = (search as string).toLowerCase();
          filteredArticles = filteredArticles.filter(article => 
            article.title.toLowerCase().includes(searchTerm) || 
            article.summary.toLowerCase().includes(searchTerm)
          );
        }
        
        // Sort articles
        if (sortBy === 'newest') {
          filteredArticles.sort((a, b) => 
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          );
        } else if (sortBy === 'oldest') {
          filteredArticles.sort((a, b) => 
            new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
          );
        }
        
        // Apply pagination
        const limitNum = parseInt(limit as string);
        const offsetNum = parseInt(offset as string);
        const paginatedArticles = filteredArticles.slice(offsetNum, offsetNum + limitNum);
        
        console.log(`Successfully fetched ${paginatedArticles.length} articles`);
        return res.json(paginatedArticles);
        
      } else if (req.method === 'POST') {
        console.log('Creating new article in memory...');
        const { title, summary, url, source, threatLevel = 'LOW', tags = [], readTime = 1 } = req.body;
        
        if (!title || !url || !source) {
          return res.status(400).json({ message: "Title, URL, and source are required" });
        }
        
        const newArticle = {
          id: String(inMemoryArticles.length + 1),
          title,
          summary,
          url,
          source,
          threatLevel,
          tags,
          readTime,
          publishedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isBookmarked: false
        };
        
        inMemoryArticles.push(newArticle);
        console.log('Successfully created article:', newArticle.id);
        return res.status(201).json(newArticle);
        
      } else {
        return res.status(405).json({ message: 'Method not allowed' });
      }
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
      const conditions: any[] = [];
      
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
}