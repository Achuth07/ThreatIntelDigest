import { config } from 'dotenv';
config(); // Load environment variables from .env file

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import * as schema from '../shared/schema';

async function identifyMissingBookmark() {
  console.log('Identifying missing bookmark...');
  
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
      title: schema.articles.title,
      source: schema.articles.source,
      publishedAt: schema.articles.publishedAt,
      threatLevel: schema.articles.threatLevel
    }).from(schema.articles);
    console.log(`Total articles: ${allArticles.length}`);
    
    // Get bookmarks with user ID 1
    console.log('Fetching bookmarks for user ID 1...');
    const userBookmarks = await db.select().from(schema.bookmarks).where(eq(schema.bookmarks.userId, 1));
    console.log(`User 1 bookmarks: ${userBookmarks.length}`);
    
    // Check each bookmark to see if the article exists and its properties
    console.log('\nAnalyzing bookmarked articles...');
    for (const bookmark of userBookmarks) {
      const article = allArticles.find(a => a.id === bookmark.articleId);
      if (article) {
        console.log(`\nBookmark ID: ${bookmark.id}`);
        console.log(`  Article ID: ${bookmark.articleId}`);
        console.log(`  Article Title: ${article.title.substring(0, 60)}...`);
        console.log(`  Source: ${article.source}`);
        console.log(`  Published: ${article.publishedAt}`);
        console.log(`  Threat Level: ${article.threatLevel}`);
      } else {
        console.log(`\nBookmark ID: ${bookmark.id} for article ${bookmark.articleId} - Article NOT FOUND`);
      }
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error identifying missing bookmark:', error);
  }
}

identifyMissingBookmark();