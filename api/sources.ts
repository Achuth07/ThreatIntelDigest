import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PostgresStorage } from '../server/postgres-storage';
import { insertRssSourceSchema } from '../shared/schema';

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
    console.log(`${req.method} /api/sources - Starting request`);
    
    const storageInstance = getStorage();
    
    if (req.method === 'GET') {
      console.log('Fetching RSS sources...');
      const sources = await storageInstance.getRssSources();
      console.log(`Successfully fetched ${sources.length} sources`);
      res.json(sources);
    } else if (req.method === 'POST') {
      console.log('Creating new RSS source...');
      const validatedData = insertRssSourceSchema.parse(req.body);
      const source = await storageInstance.createRssSource(validatedData);
      console.log('Successfully created RSS source:', source.id);
      res.status(201).json(source);
    } catch (error) {
      console.error('Error creating RSS source:', error);
      res.status(400).json({ 
        message: "Invalid source data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'PATCH') {
    try {
      console.log('Updating RSS source...');
      const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
      const sourceId = pathname.split('/').pop();
      
      if (!sourceId) {
        return res.status(400).json({ message: "Source ID is required" });
      }
      
      const updateData = req.body;
      const updatedSource = await storageInstance.updateRssSource(sourceId, updateData);
      
      if (updatedSource) {
        console.log('Successfully updated RSS source:', sourceId);
        res.json(updatedSource);
      } else {
        res.status(404).json({ message: "Source not found" });
      }
    } catch (error) {
      console.error('Error updating RSS source:', error);
      res.status(400).json({ 
        message: "Invalid update data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      console.log('Deleting RSS source...');
      const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
      const sourceId = pathname.split('/').pop();
      
      if (!sourceId) {
        return res.status(400).json({ message: "Source ID is required" });
      }
      
      const deleted = await storageInstance.deleteRssSource(sourceId);
      
      if (deleted) {
        console.log('Successfully deleted RSS source:', sourceId);
        res.status(204).send('');
      } else {
        res.status(404).json({ message: "Source not found" });
      }
    } catch (error) {
      console.error('Error deleting RSS source:', error);
      res.status(500).json({ 
        message: "Failed to delete source",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
  } catch (error) {
    console.error('Fatal error in sources API:', error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error instanceof Error ? error.message : 'Unknown error',
      hasDbUrl: !!process.env.DATABASE_URL
    });
  }
}