import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('Basic diagnostic starting...');
    
    // Check environment variables
    const hasDbUrl = !!process.env.DATABASE_URL;
    const nodeEnv = process.env.NODE_ENV;
    
    console.log('Environment check:', { hasDbUrl, nodeEnv });
    
    // Basic response without database connection
    res.json({
      status: 'Function is working',
      timestamp: new Date().toISOString(),
      environment: {
        hasDbUrl,
        nodeEnv,
        dbUrlLength: process.env.DATABASE_URL?.length || 0
      },
      message: 'Basic serverless function test successful'
    });
    
  } catch (error) {
    console.error('Basic diagnostic failed:', error);
    
    res.status(500).json({
      error: 'Basic diagnostic failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}