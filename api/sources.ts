import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PostgresStorage } from '../server/postgres-storage';
import { insertRssSourceSchema } from '../shared/schema';

const storage = new PostgresStorage();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const sources = await storage.getRssSources();
      res.json(sources);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch RSS sources" });
    }
  } else if (req.method === 'POST') {
    try {
      const validatedData = insertRssSourceSchema.parse(req.body);
      const source = await storage.createRssSource(validatedData);
      res.status(201).json(source);
    } catch (error) {
      res.status(400).json({ message: "Invalid source data" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}