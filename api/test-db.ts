import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PostgresStorage } from '../server/postgres-storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Testing database connection...');
    
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        error: 'DATABASE_URL environment variable is not set',
        hasDbUrl: false
      });
    }

    console.log('DATABASE_URL exists, testing connection...');
    
    // Try to create storage instance and test connection
    const storage = new PostgresStorage();
    console.log('Storage instance created');
    
    // Test a simple query
    const sources = await storage.getRssSources();
    console.log(`Found ${sources.length} RSS sources`);
    
    res.json({
      success: true,
      message: 'Database connection successful',
      hasDbUrl: true,
      sourcesCount: sources.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database test failed:', error);
    
    res.status(500).json({
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      hasDbUrl: !!process.env.DATABASE_URL,
      timestamp: new Date().toISOString()
    });
  }
}