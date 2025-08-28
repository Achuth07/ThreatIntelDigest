import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const steps: string[] = [];
  
  try {
    steps.push('Starting database connection test...');
    
    // Step 1: Check environment
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        error: 'DATABASE_URL missing',
        steps 
      });
    }
    steps.push('✅ DATABASE_URL found');
    
    // Step 2: Import Neon driver
    steps.push('Importing @neondatabase/serverless...');
    const { Pool } = await import('@neondatabase/serverless');
    steps.push('✅ @neondatabase/serverless imported');
    
    // Step 3: Import Drizzle
    steps.push('Importing drizzle-orm...');
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { sql } = await import('drizzle-orm');
    steps.push('✅ drizzle-orm imported');
    
    // Step 4: Create connection pool
    steps.push('Creating connection pool...');
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL 
    });
    steps.push('✅ Connection pool created');
    
    // Step 5: Create Drizzle instance
    steps.push('Creating drizzle instance...');
    const db = drizzle(pool);
    steps.push('✅ Drizzle instance created');
    
    // Step 6: Test simple query
    steps.push('Testing database query...');
    const result = await db.execute(sql`SELECT 1 as test, NOW() as timestamp`);
    steps.push('✅ Database query successful');
    
    // Step 7: Test table existence
    steps.push('Checking if tables exist...');
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rss_sources', 'articles', 'bookmarks')
    `);
    steps.push(`✅ Found ${tableCheck.rows?.length || 0} application tables`);
    
    res.json({
      success: true,
      message: 'Database connection fully tested',
      steps,
      queryResult: result.rows?.[0],
      existingTables: tableCheck.rows?.map((row: any) => row.table_name) || [],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    steps.push(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    res.status(500).json({
      error: 'Database test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      steps,
      errorDetails: {
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
}