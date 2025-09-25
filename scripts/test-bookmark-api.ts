import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { eq, desc, isNull } from 'drizzle-orm';
import * as schema from '../shared/schema';

async function testBookmarkAPI() {
  console.log('Testing bookmark API...');
  
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL found, using in-memory storage');
    return;
  }
  
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    
    // Get all bookmarks
    console.log('Fetching all bookmarks...');
    const allBookmarks = await db.select().from(schema.bookmarks);
    console.log(`Total bookmarks: ${allBookmarks.length}`);
    console.log('Bookmarks:', allBookmarks);
    
    // Get bookmarks with user ID 1
    console.log('Fetching bookmarks for user ID 1...');
    const userBookmarks = await db.select().from(schema.bookmarks).where(eq(schema.bookmarks.userId, 1));
    console.log(`User 1 bookmarks: ${userBookmarks.length}`);
    console.log('User 1 bookmarks:', userBookmarks);
    
    // Check for orphaned bookmarks (bookmarks that reference non-existent articles)
    console.log('Checking for orphaned bookmarks...');
    const orphanedBookmarks = await db.select({
      bookmarkId: schema.bookmarks.id,
      articleId: schema.bookmarks.articleId,
      userId: schema.bookmarks.userId,
      createdAt: schema.bookmarks.createdAt
    })
    .from(schema.bookmarks)
    .leftJoin(schema.articles, eq(schema.bookmarks.articleId, schema.articles.id))
    .where(isNull(schema.articles.id));
    
    console.log(`Orphaned bookmarks: ${orphanedBookmarks.length}`);
    if (orphanedBookmarks.length > 0) {
      console.log('Orphaned bookmarks:', orphanedBookmarks);
    }
    
    // Get bookmarks with articles for user ID 1
    console.log('Fetching bookmarks with articles for user ID 1...');
    const bookmarksWithArticles = await db
      .select({
        bookmark: schema.bookmarks,
        article: schema.articles
      })
      .from(schema.bookmarks)
      .innerJoin(schema.articles, eq(schema.bookmarks.articleId, schema.articles.id))
      .where(eq(schema.bookmarks.userId, 1))
      .orderBy(desc(schema.bookmarks.createdAt));
    
    console.log(`Bookmarks with articles for user 1: ${bookmarksWithArticles.length}`);
    bookmarksWithArticles.forEach((item, index) => {
      console.log(`Bookmark ${index + 1}:`, {
        bookmarkId: item.bookmark.id,
        articleId: item.bookmark.articleId,
        articleTitle: item.article.title,
        articleUrl: item.article.url
      });
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error testing bookmark API:', error);
  }
}

testBookmarkAPI();