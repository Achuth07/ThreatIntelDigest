import { config } from 'dotenv';
config(); // Load environment variables from .env file

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import * as schema from '../shared/schema';

// Simulate the filtering logic from the frontend
function filterArticles(articles: any[], timeFilter: string, threatFilters: string[], selectedSource: string) {
  return articles.filter(article => {
    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      const articleDate = new Date(article.publishedAt);
      const diffInDays = Math.floor((now.getTime() - articleDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (timeFilter) {
        case 'today':
          if (diffInDays > 0) return false;
          break;
        case 'week':
          if (diffInDays > 7) return false;
          break;
        case 'month':
          if (diffInDays > 30) return false;
          break;
      }
    }

    // Threat level filter
    if (!threatFilters.includes(article.threatLevel)) {
      return false;
    }

    // Source filter
    if (selectedSource !== 'all' && article.source !== selectedSource) {
      return false;
    }

    return true;
  });
}

async function simulateBookmarkFiltering() {
  console.log('Simulating bookmark filtering...');
  
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL found');
    return;
  }
  
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    
    // Get all articles (only necessary fields)
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
    
    // Get bookmarked articles
    const bookmarkedArticles = allArticles.filter(article => 
      userBookmarks.some(bookmark => bookmark.articleId === article.id)
    );
    console.log(`Bookmarked articles found in database: ${bookmarkedArticles.length}`);
    
    // Test different filter combinations
    const filterCombinations = [
      { timeFilter: 'all', threatFilters: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], selectedSource: 'all' },
      { timeFilter: 'today', threatFilters: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], selectedSource: 'all' },
      { timeFilter: 'week', threatFilters: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], selectedSource: 'all' },
      { timeFilter: 'month', threatFilters: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], selectedSource: 'all' },
      { timeFilter: 'all', threatFilters: ['CRITICAL', 'HIGH', 'MEDIUM'], selectedSource: 'all' },
      { timeFilter: 'all', threatFilters: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], selectedSource: 'Bleeping Computer' },
    ];
    
    console.log('\nTesting filter combinations:');
    filterCombinations.forEach((filters, index) => {
      const filteredArticles = filterArticles(bookmarkedArticles, filters.timeFilter, filters.threatFilters, filters.selectedSource);
      console.log(`\nCombination ${index + 1}:`);
      console.log(`  Time filter: ${filters.timeFilter}`);
      console.log(`  Threat filters: ${filters.threatFilters.join(', ')}`);
      console.log(`  Source filter: ${filters.selectedSource}`);
      console.log(`  Result count: ${filteredArticles.length}`);
      
      if (filteredArticles.length < bookmarkedArticles.length) {
        console.log(`  Missing articles:`);
        const missingArticles = bookmarkedArticles.filter(article => 
          !filteredArticles.some(filtered => filtered.id === article.id)
        );
        missingArticles.forEach(article => {
          console.log(`    - ${article.title.substring(0, 50)}...`);
        });
      }
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error simulating bookmark filtering:', error);
  }
}

simulateBookmarkFiltering();