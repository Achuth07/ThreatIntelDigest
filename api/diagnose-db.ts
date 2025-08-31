import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Starting comprehensive database diagnosis...');
    
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        error: 'DATABASE_URL environment variable is required'
      });
    }
    
    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    const diagnosis: any = {
      database: {
        connected: false,
        currentTime: null
      },
      tables: {
        existing: [],
        missing: [],
        details: {}
      },
      vulnerabilities: {
        tableExists: false,
        recordCount: 0,
        sampleRecords: [],
        schema: null
      },
      environment: {
        nvdApiKey: !!process.env.NVD_API_KEY,
        databaseUrl: !!process.env.DATABASE_URL
      }
    };
    
    // Test basic connectivity
    try {
      const result = await db.execute(sql`SELECT NOW() as current_time`);
      diagnosis.database.connected = true;
      diagnosis.database.currentTime = result.rows[0]?.current_time;
    } catch (error) {
      diagnosis.database.error = error instanceof Error ? error.message : 'Unknown error';
      return res.json(diagnosis);
    }
    
    // Check all expected tables
    const expectedTables = ['articles', 'bookmarks', 'rss_sources', 'vulnerabilities'];
    
    try {
      const tableCheck = await db.execute(sql`
        SELECT table_name, 
               column_name, 
               data_type, 
               is_nullable,
               column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name IN ('articles', 'bookmarks', 'rss_sources', 'vulnerabilities')
        ORDER BY table_name, ordinal_position
      `);
      
      const tableDetails: any = {};
      for (const row of tableCheck.rows) {
        const tableName = row.table_name as string;
        if (!tableDetails[tableName]) {
          tableDetails[tableName] = { columns: [] };
        }
        tableDetails[tableName].columns.push({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default
        });
      }
      
      diagnosis.tables.existing = Object.keys(tableDetails);
      diagnosis.tables.missing = expectedTables.filter(table => !diagnosis.tables.existing.includes(table));
      diagnosis.tables.details = tableDetails;
      
    } catch (error) {
      diagnosis.tables.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // Deep dive into vulnerabilities table
    if (diagnosis.tables.existing.includes('vulnerabilities')) {
      diagnosis.vulnerabilities.tableExists = true;
      
      try {
        // Count total records
        const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM vulnerabilities`);
        diagnosis.vulnerabilities.recordCount = parseInt(countResult.rows[0]?.count as string || '0');
        
        // Get sample records (latest 5)
        const sampleResult = await db.execute(sql`
          SELECT id, description, published_date, last_modified_date, vuln_status,
                 cvss_v3_score, cvss_v3_severity, created_at
          FROM vulnerabilities 
          ORDER BY created_at DESC 
          LIMIT 5
        `);
        
        diagnosis.vulnerabilities.sampleRecords = sampleResult.rows;
        
        // Check for any records from the last 7 days
        const recentResult = await db.execute(sql`
          SELECT COUNT(*) as count 
          FROM vulnerabilities 
          WHERE created_at >= NOW() - INTERVAL '7 days'
        `);
        
        diagnosis.vulnerabilities.recentCount = parseInt(recentResult.rows[0]?.count as string || '0');
        
        // Check for any fetch errors or patterns
        const severityDistribution = await db.execute(sql`
          SELECT cvss_v3_severity, COUNT(*) as count
          FROM vulnerabilities 
          WHERE cvss_v3_severity IS NOT NULL
          GROUP BY cvss_v3_severity
          ORDER BY count DESC
        `);
        
        diagnosis.vulnerabilities.severityDistribution = severityDistribution.rows;
        
      } catch (error) {
        diagnosis.vulnerabilities.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }
    
    // Test vulnerabilities API endpoint functionality
    try {
      // Simulate the API call that would be made by the frontend
      const apiTestResult = await db.execute(sql`
        SELECT id, description, published_date, last_modified_date, vuln_status,
               cvss_v3_score, cvss_v3_severity, cvss_v2_score, cvss_v2_severity,
               weaknesses, reference_urls, created_at
        FROM vulnerabilities 
        ORDER BY last_modified_date DESC 
        LIMIT 10
      `);
      
      diagnosis.apiTest = {
        recordsReturned: apiTestResult.rows.length,
        sampleRecord: apiTestResult.rows[0] || null
      };
      
    } catch (error) {
      diagnosis.apiTest = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Provide recommendations
    diagnosis.recommendations = [];
    
    if (!diagnosis.vulnerabilities.tableExists) {
      diagnosis.recommendations.push('❌ CRITICAL: vulnerabilities table is missing. Run database initialization.');
    } else if (diagnosis.vulnerabilities.recordCount === 0) {
      diagnosis.recommendations.push('⚠️  WARNING: vulnerabilities table exists but is empty. Run CVE fetch process.');
    } else if (diagnosis.vulnerabilities.recentCount === 0) {
      diagnosis.recommendations.push('⚠️  WARNING: No recent CVE data found. Consider running fresh CVE fetch.');
    } else {
      diagnosis.recommendations.push('✅ vulnerabilities table appears to be working correctly.');
    }
    
    if (!diagnosis.environment.nvdApiKey) {
      diagnosis.recommendations.push('❌ CRITICAL: NVD_API_KEY environment variable is missing.');
    }
    
    if (diagnosis.tables.missing.length > 0) {
      diagnosis.recommendations.push(`❌ MISSING TABLES: ${diagnosis.tables.missing.join(', ')}`);
    }
    
    res.json(diagnosis);
    
  } catch (error) {
    console.error("Database diagnosis failed:", error);
    res.status(500).json({ 
      error: 'Database diagnosis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      recommendations: [
        'Check DATABASE_URL environment variable',
        'Verify database connectivity',
        'Run database initialization if needed'
      ]
    });
  }
}