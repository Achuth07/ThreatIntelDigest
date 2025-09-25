import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../shared/schema';

async function debugBookmarks() {
  console.log('Debugging bookmarks...');
  
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL found');
    return;
  }
  
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    
    // Get all articles (only id and title to avoid schema issues)
    console.log('Fetching all articles...');
    const allArticles = await db.select({
      id: schema.articles.id,
      title: schema.articles.title
    }).from(schema.articles);
    console.log(`Total articles: ${allArticles.length}`);
    
    // Get bookmarks with user ID 1
    console.log('Fetching bookmarks for user ID 1...');
    const userBookmarks = await db.select().from(schema.bookmarks).where(eq(schema.bookmarks.userId, 1));
    console.log(`User 1 bookmarks: ${userBookmarks.length}`);
    console.log('User 1 bookmarks:', userBookmarks);
    
    // Check each bookmark to see if the article exists
    console.log('Checking bookmarked articles...');
    for (const bookmark of userBookmarks) {
      const article = allArticles.find(a => a.id === bookmark.articleId);
      if (article) {
        console.log(`Bookmark ${bookmark.id} for article ${bookmark.articleId} - Article exists: ${article.title.substring(0, 50)}...`);
      } else {
        console.log(`Bookmark ${bookmark.id} for article ${bookmark.articleId} - Article NOT FOUND`);
      }
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error debugging bookmarks:', error);
  }
}

debugBookmarks();