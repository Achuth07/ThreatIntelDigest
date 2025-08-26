import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PostgresStorage } from '../server/postgres-storage';
import { insertArticleSchema } from '../shared/schema';

let storage: PostgresStorage | null = null;

function getStorage() {
  if (!storage) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    storage = new PostgresStorage();
  }
  return storage;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log(`${req.method} /api/articles - Starting request`);
    
    const storageInstance = getStorage();
    
    if (req.method === 'GET') {
      console.log('Fetching articles...');
      const { source, limit, offset, search, sortBy } = req.query;
      const articles = await storageInstance.getArticles({
        source: source as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        search: search as string,
        sortBy: sortBy as string,
      });

      console.log(`Successfully fetched ${articles.length} articles`);
      
      // Get bookmark status for each article
      const articlesWithBookmarks = await Promise.all(
        articles.map(async (article) => ({
          ...article,
          isBookmarked: await storageInstance.isBookmarked(article.id),
        }))
      );

      res.json(articlesWithBookmarks);
    } else if (req.method === 'POST') {
      console.log('Creating new article...');
      const validatedData = insertArticleSchema.parse(req.body);
      const article = await storageInstance.createArticle(validatedData);
      console.log('Successfully created article:', article.id);
      res.status(201).json(article);
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Fatal error in articles API:', error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error instanceof Error ? error.message : 'Unknown error',
      hasDbUrl: !!process.env.DATABASE_URL
    });
  }