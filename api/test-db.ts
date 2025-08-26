import type { VercelRequest, VercelResponse } from '@vercel/node';

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
        hasDbUrl: false,
        suggestion: 'Add DATABASE_URL to Vercel environment variables'
      });
    }

    console.log('DATABASE_URL exists, attempting database connection...');
    
    // Import database modules only after checking environment
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');
    
    console.log('Database modules imported successfully');
    
    // Test connection
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    console.log('Database connection established, testing query...');
    
    // Simple test query
    const result = await db.execute(sql`SELECT 1 as test`);
    
    console.log('Test query successful');
    
    res.json({
      success: true,
      message: 'Database connection successful',
      hasDbUrl: true,
      testResult: result.rows?.[0] || null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database test failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      error: 'Database connection failed',
      message: errorMessage,
      hasDbUrl: !!process.env.DATABASE_URL,
      timestamp: new Date().toISOString(),
      details: {
        name: error instanceof Error ? error.name : 'UnknownError',
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
      }
    });
  }
}