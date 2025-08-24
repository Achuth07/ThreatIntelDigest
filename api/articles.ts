import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PostgresStorage } from '../server/postgres-storage';
import { insertArticleSchema } from '../shared/schema';

const storage = new PostgresStorage();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const { source, limit, offset, search, sortBy } = req.query;
      const articles = await storage.getArticles({
        source: source as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        search: search as string,
        sortBy: sortBy as string,
      });

      // Get bookmark status for each article
      const articlesWithBookmarks = await Promise.all(
        articles.map(async (article) => ({
          ...article,
          isBookmarked: await storage.isBookmarked(article.id),
        }))
      );

      res.json(articlesWithBookmarks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  } else if (req.method === 'POST') {
    try {
      const validatedData = insertArticleSchema.parse(req.body);
      const article = await storage.createArticle(validatedData);
      res.status(201).json(article);
    } catch (error) {
      res.status(400).json({ message: "Invalid article data" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}