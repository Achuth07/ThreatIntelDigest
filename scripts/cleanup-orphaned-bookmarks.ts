import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { eq, isNull } from 'drizzle-orm';
import * as schema from '../shared/schema';

async function cleanupOrphanedBookmarks() {
  console.log('Cleaning up orphaned bookmarks...');
  
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL found');
    return;
  }
  
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    
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
    
    console.log(`Found ${orphanedBookmarks.length} orphaned bookmarks`);
    
    if (orphanedBookmarks.length > 0) {
      console.log('Orphaned bookmarks:', orphanedBookmarks);
      
      // Delete orphaned bookmarks
      for (const bookmark of orphanedBookmarks) {
        console.log(`Deleting orphaned bookmark ${bookmark.bookmarkId} for article ${bookmark.articleId}`);
        await db.delete(schema.bookmarks).where(eq(schema.bookmarks.id, bookmark.bookmarkId));
      }
      
      console.log('Orphaned bookmarks cleaned up successfully');
    } else {
      console.log('No orphaned bookmarks found');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error cleaning up orphaned bookmarks:', error);
  }
}

cleanupOrphanedBookmarks();