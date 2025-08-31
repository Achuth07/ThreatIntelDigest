import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Fetching vulnerabilities from database...');
    
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is missing');
      return res.status(500).json({ 
        error: 'DATABASE_URL environment variable is required',
        debug: 'Check Vercel environment variables configuration'
      });
    }
    
    console.log('DATABASE_URL is configured');
    
    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql, desc } = await import('drizzle-orm');
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    console.log('Database connection established');
    
    // Test database connectivity and table existence
    try {
      const tableCheck = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'vulnerabilities'
      `);
      
      const tableExists = parseInt(tableCheck.rows[0]?.count as string || '0') > 0;
      
      if (!tableExists) {
        console.error('vulnerabilities table does not exist');
        return res.status(500).json({
          error: 'vulnerabilities table does not exist',
          debug: 'Run database initialization first: POST /api/database?action=init',
          tableExists: false
        });
      }
      
      console.log('vulnerabilities table exists');
      
      // Check if table has any data
      const countCheck = await db.execute(sql`SELECT COUNT(*) as total FROM vulnerabilities`);
      const totalRecords = parseInt(countCheck.rows[0]?.total as string || '0');
      console.log(`Total vulnerabilities in database: ${totalRecords}`);
      
      if (totalRecords === 0) {
        console.warn('vulnerabilities table is empty');
        return res.json({
          vulnerabilities: [],
          pagination: {
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
          meta: {
            count: 0,
            lastUpdated: new Date().toISOString(),
            message: 'No vulnerabilities found. Run CVE fetch process to populate data.',
            debug: 'POST /api/fetch-cves to fetch data from NVD'
          },
        });
      }
      
    } catch (dbError) {
      console.error('Database connectivity or table check failed:', dbError);
      return res.status(500).json({
        error: 'Database connectivity failed',
        debug: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }
    
    // Parse query parameters
    const { 
      limit = '50', 
      severity, 
      page = '1' 
    } = req.query;
    
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);
    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const offset = (pageNum - 1) * limitNum;
    
    let query = sql`
      SELECT 
        id,
        description,
        published_date,
        last_modified_date,
        vuln_status,
        cvss_v3_score,
        cvss_v3_severity,
        cvss_v2_score,
        cvss_v2_severity,
        weaknesses,
        reference_urls,
        created_at
      FROM vulnerabilities
    `;
    
    // Add severity filter if provided
    if (severity && typeof severity === 'string') {
      const severityUpper = severity.toUpperCase();
      if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(severityUpper)) {
        query = sql`
          ${query}
          WHERE (cvss_v3_severity = ${severityUpper} OR cvss_v2_severity = ${severityUpper})
        `;
      }
    }
    
    // Add ordering and pagination
    query = sql`
      ${query}
      ORDER BY last_modified_date DESC, published_date DESC
      LIMIT ${limitNum}
      OFFSET ${offset}
    `;
    
    const result = await db.execute(query);
    
    // Get total count for pagination
    let countQuery = sql`SELECT COUNT(*) as total FROM vulnerabilities`;
    if (severity && typeof severity === 'string') {
      const severityUpper = severity.toUpperCase();
      if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(severityUpper)) {
        countQuery = sql`
          SELECT COUNT(*) as total FROM vulnerabilities
          WHERE (cvss_v3_severity = ${severityUpper} OR cvss_v2_severity = ${severityUpper})
        `;
      }
    }
    
    const countResult = await db.execute(countQuery);
    const totalCount = Number(countResult.rows[0]?.total || 0);
    
    // Format vulnerabilities data
    const vulnerabilities = result.rows.map((row: any) => ({
      id: row.id,
      description: row.description,
      publishedDate: row.published_date,
      lastModifiedDate: row.last_modified_date,
      vulnStatus: row.vuln_status,
      cvssV3Score: row.cvss_v3_score ? parseFloat(row.cvss_v3_score) : null,
      cvssV3Severity: row.cvss_v3_severity,
      cvssV2Score: row.cvss_v2_score ? parseFloat(row.cvss_v2_score) : null,
      cvssV2Severity: row.cvss_v2_severity,
      weaknesses: row.weaknesses || [],
      references: row.reference_urls || [],
      createdAt: row.created_at,
    }));
    
    console.log(`Found ${vulnerabilities.length} vulnerabilities`);
    
    res.json({
      vulnerabilities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNext: pageNum * limitNum < totalCount,
        hasPrev: pageNum > 1,
      },
      meta: {
        count: vulnerabilities.length,
        lastUpdated: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error("Error fetching vulnerabilities:", error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      databaseUrl: !!process.env.DATABASE_URL
    });
    
    res.status(500).json({ 
      message: "Failed to fetch vulnerabilities",
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        timestamp: new Date().toISOString(),
        databaseConfigured: !!process.env.DATABASE_URL,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    });
  }
}