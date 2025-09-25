import type { VercelRequest, VercelResponse } from '@vercel/node';
import Parser from 'rss-parser';

const parser = new Parser();

// Helper functions
function determineThreatLevel(title: string, content: string): string {
  const text = (title + " " + content).toLowerCase();
  
  if (text.includes("critical") || text.includes("zero-day") || text.includes("ransomware")) {
    return "CRITICAL";
  } else if (text.includes("high") || text.includes("vulnerability") || text.includes("exploit")) {
    return "HIGH";
  } else {
    return "MEDIUM";
  }
}

function extractTags(title: string, content: string): string[] {
  const text = (title + " " + content).toLowerCase();
  const tags: string[] = [];
  
  const commonTags = [
    "malware", "ransomware", "phishing", "zero-day", "vulnerability", 
    "exploit", "apt", "microsoft", "google", "apple", "android", "ios",
    "windows", "linux", "cloud", "aws", "azure", "kubernetes", "docker"
  ];
  
  commonTags.forEach(tag => {
    if (text.includes(tag)) {
      tags.push(tag.charAt(0).toUpperCase() + tag.slice(1));
    }
  });
  
  return tags.slice(0, 3); // Limit to 3 tags
}

function estimateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Starting RSS feed fetch process...');
    
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
    
    // Clean up old articles (older than 30 days)
    console.log('Cleaning up old articles...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const cleanupResult = await db.execute(sql`
      DELETE FROM articles 
      WHERE published_at < ${thirtyDaysAgo}
    `);
    
    console.log(`Cleaned up ${cleanupResult.rowCount || 0} old articles`);
    
    // Get active RSS sources
    console.log('Fetching active RSS sources...');
    const sourcesResult = await db.execute(sql`
      SELECT id, name, url, icon, color, is_active 
      FROM rss_sources 
      WHERE is_active = true
    `);
    
    const activeSources = sourcesResult.rows;
    console.log(`Found ${activeSources.length} active RSS sources`);
    
    let totalFetched = 0;
    let feedResults: any[] = [];
    
    for (const source of activeSources) {
      let sourceResult: any = {
        name: source.name,
        url: source.url,
        itemsFound: 0,
        itemsProcessed: 0,
        errors: [] as string[]
      };
      try {
        console.log(`Fetching feed from ${source.name} (${source.url})...`);
        const feed = await parser.parseURL(source.url as string);
        console.log(`Feed parsed successfully. Found ${feed.items.length} items`);
        
        sourceResult.itemsFound = feed.items.length;
        
        let processedCount = 0;
        for (const item of feed.items.slice(0, 10)) { // Limit to 10 latest items per source
          if (!item.title || !item.link) {
            console.log('Skipping item: missing title or link');
            continue;
          }

          // Check if article already exists
          const existingResult = await db.execute(sql`
            SELECT id FROM articles WHERE url = ${item.link}
          `);
          
          if (existingResult.rows.length === 0) {
            const threatLevel = determineThreatLevel(item.title || "", item.contentSnippet || "");
            const tags = extractTags(item.title || "", item.contentSnippet || "");
            const readTime = estimateReadTime(item.contentSnippet || item.content || "");
            const summary = (item.contentSnippet || item.content?.substring(0, 300) || "") + ((item.content && item.content.length > 300) ? "..." : "");
            
            // Handle published date - use current time if parsing fails
            let publishedAt: Date;
            try {
              publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
              // Validate the date
              if (isNaN(publishedAt.getTime())) {
                publishedAt = new Date();
              }
            } catch {
              publishedAt = new Date();
            }
            
            try {
              console.log(`Inserting article: ${item.title}`);
              console.log(`Published At:`, publishedAt);
              
              // Temporarily skip tags field to get basic insertion working
              await db.execute(sql`
                INSERT INTO articles (title, summary, url, source, threat_level, read_time, published_at)
                VALUES (${item.title}, ${summary}, ${item.link}, ${source.name}, ${threatLevel}, ${readTime}, ${publishedAt})
              `);
              
              totalFetched++;
              processedCount++;
              sourceResult.itemsProcessed++;
              console.log(`Saved article: ${item.title}`);
            } catch (insertError) {
              console.error(`Failed to insert article "${item.title}":`, insertError);
              sourceResult.errors.push(`Insert failed: ${insertError instanceof Error ? insertError.message : 'Unknown error'}`);
            }
          } else {
            console.log(`Article already exists: ${item.title}`);
          }
        }

        // Update last fetched timestamp for the source
        await db.execute(sql`
          UPDATE rss_sources 
          SET last_fetched = NOW() 
          WHERE id = ${source.id}
        `);
        
        console.log(`Processed ${processedCount} new articles from ${source.name}`);
        
      } catch (feedError) {
        console.error(`Error fetching feed for ${source.name}:`, feedError);
        console.error('Feed URL:', source.url);
        console.error('Error details:', feedError instanceof Error ? feedError.message : feedError);
        sourceResult.errors.push(feedError instanceof Error ? feedError.message : 'Unknown error');
      }
      
      feedResults.push(sourceResult);
    }

    console.log(`Feed fetch complete. Fetched ${totalFetched} new articles.`);
    res.json({ 
      message: `Successfully fetched ${totalFetched} new articles`,
      totalFetched,
      sourceResults: feedResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error fetching feeds:", error);
    res.status(500).json({ 
      message: "Failed to fetch RSS feeds",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}