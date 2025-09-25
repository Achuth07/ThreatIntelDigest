import { getDb } from '../server/db';
import * as schema from '../shared/schema';
import { eq, isNull } from 'drizzle-orm';

async function checkOrphanedBookmarks() {
  try {
    const db = getDb();
    
    // Check for bookmarks that reference non-existent articles
    const orphanedBookmarks = await db.select({
      bookmarkId: schema.bookmarks.id,
      articleId: schema.bookmarks.articleId,
      userId: schema.bookmarks.userId,
      createdAt: schema.bookmarks.createdAt
    })
    .from(schema.bookmarks)
    .leftJoin(schema.articles, eq(schema.bookmarks.articleId, schema.articles.id))
    .where(isNull(schema.articles.id));
    
    console.log('Orphaned bookmarks found:', orphanedBookmarks.length);
    
    if (orphanedBookmarks.length > 0) {
      console.log('Orphaned bookmarks details:');
      orphanedBookmarks.forEach(bookmark => {
        console.log(`- Bookmark ID: ${bookmark.bookmarkId}, Article ID: ${bookmark.articleId}, User ID: ${bookmark.userId}`);
      });
      
      // Optionally, clean up orphaned bookmarks
      console.log('\nCleaning up orphaned bookmarks...');
      const deletedCount = 0;
      // Uncomment the following lines to actually delete orphaned bookmarks
      /*
      const result = await db.delete(schema.bookmarks)
        .where(schema.bookmarks.id.in(orphanedBookmarks.map(b => b.bookmarkId)));
      console.log(`Deleted ${result.rowCount} orphaned bookmarks`);
      */
    } else {
      console.log('No orphaned bookmarks found.');
    }
    
    // Check the total bookmark count for user 1 (assuming this is the test user)
    const userBookmarks = await db.select().from(schema.bookmarks).where(eq(schema.bookmarks.userId, 1));
    console.log(`Total bookmarks for user 1: ${userBookmarks.length}`);
    
    // Display details of user bookmarks
    if (userBookmarks.length > 0) {
      console.log('\nUser bookmarks details:');
      for (const bookmark of userBookmarks) {
        console.log(`- Bookmark ID: ${bookmark.id}, Article ID: ${bookmark.articleId}, Created: ${bookmark.createdAt}`);
        
        // Check if the article exists
        const article = await db.select().from(schema.articles).where(eq(schema.articles.id, bookmark.articleId)).limit(1);
        if (article.length > 0) {
          console.log(`  Article exists: ${article[0].title} (${article[0].source})`);
        } else {
          console.log(`  Article does not exist!`);
        }
      }
    }
    
    // Also check all articles to see what's available
    const allArticles = await db.select().from(schema.articles).limit(10);
    console.log(`\nTotal articles in database: ${allArticles.length}`);
    console.log('Recent articles:');
    allArticles.forEach(article => {
      console.log(`- ${article.title} (${article.source}) - ID: ${article.id}`);
    });
    
  } catch (error) {
    console.error('Error checking orphaned bookmarks:', error);
  }
}

checkOrphanedBookmarks();