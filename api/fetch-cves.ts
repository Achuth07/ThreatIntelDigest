import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Starting CVE fetch process...');
    
    // Enhanced environment variable checking
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is missing');
      return res.status(500).json({ 
        error: 'DATABASE_URL environment variable is required',
        debug: 'Check Vercel environment variables configuration'
      });
    }

    if (!process.env.NVD_API_KEY) {
      console.error('NVD_API_KEY environment variable is missing');
      return res.status(500).json({ 
        error: 'NVD_API_KEY environment variable is required',
        debug: 'Check Vercel environment variables configuration'
      });
    }
    
    console.log('Environment variables are set correctly');
    
    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');
    
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
      
      if (parseInt(tableCheck.rows[0]?.count as string || '0') === 0) {
        console.error('vulnerabilities table does not exist');
        return res.status(500).json({
          error: 'vulnerabilities table does not exist',
          debug: 'Run database initialization first: POST /api/database?action=init'
        });
      }
      
      console.log('vulnerabilities table exists');
    } catch (dbError) {
      console.error('Database connectivity test failed:', dbError);
      return res.status(500).json({
        error: 'Database connectivity failed',
        debug: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }
    
    console.log('Fetching latest CVEs from NVD API...');
    
    // Calculate date range for recent CVEs (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Fetch CVEs from NVD API
    const nvdResponse = await fetch(
      `https://services.nvd.nist.gov/rest/json/cves/2.0/?lastModStartDate=${startDateStr}T00:00:00.000&lastModEndDate=${endDateStr}T23:59:59.999&resultsPerPage=50`,
      {
        headers: {
          'apiKey': process.env.NVD_API_KEY,
          'User-Agent': 'ThreatIntelDigest/1.0',
          'Accept': 'application/json'
        }
      }
    );
    
    if (!nvdResponse.ok) {
      throw new Error(`NVD API error: ${nvdResponse.status} ${nvdResponse.statusText}`);
    }
    
    const nvdData = await nvdResponse.json();
    console.log(`Found ${nvdData.vulnerabilities?.length || 0} CVEs from NVD`);
    
    let processedCount = 0;
    let errors: string[] = [];
    
    if (nvdData.vulnerabilities && nvdData.vulnerabilities.length > 0) {
      for (const vuln of nvdData.vulnerabilities) {
        try {
          const cve = vuln.cve;
          const cveId = cve.id;
          
          // Check if CVE already exists
          const existingResult = await db.execute(sql`
            SELECT id FROM vulnerabilities WHERE id = ${cveId}
          `);
          
          if (existingResult.rows.length === 0) {
            // Extract description
            const description = cve.descriptions?.find((desc: any) => desc.lang === 'en')?.value || 'No description available';
            
            // Extract CVSS scores
            let cvssV3Score = null;
            let cvssV3Severity = null;
            let cvssV2Score = null;
            let cvssV2Severity = null;
            
            const metrics = cve.metrics;
            if (metrics?.cvssMetricV31?.[0]) {
              cvssV3Score = metrics.cvssMetricV31[0].cvssData.baseScore;
              cvssV3Severity = metrics.cvssMetricV31[0].cvssData.baseSeverity;
            } else if (metrics?.cvssMetricV30?.[0]) {
              cvssV3Score = metrics.cvssMetricV30[0].cvssData.baseScore;
              cvssV3Severity = metrics.cvssMetricV30[0].cvssData.baseSeverity;
            }
            
            if (metrics?.cvssMetricV2?.[0]) {
              cvssV2Score = metrics.cvssMetricV2[0].cvssData.baseScore;
              cvssV2Severity = metrics.cvssMetricV2[0].baseSeverity;
            }
            
            // Extract weaknesses (CWEs)
            const weaknesses = cve.weaknesses?.map((weakness: any) => 
              weakness.description?.find((desc: any) => desc.lang === 'en')?.value
            ).filter(Boolean) || [];
            
            // Extract references
            const references = cve.references?.map((ref: any) => ({
              url: ref.url,
              source: ref.source || 'Unknown',
              tags: ref.tags || []
            })) || [];
            
            // Extract configurations (simplified) - Skip for now since column doesn't exist
            // const configurations = cve.configurations?.nodes || [];
            
            // Convert arrays to proper PostgreSQL format
            // Ensure weaknesses is a proper string array for PostgreSQL text[]
            const weaknessesArray = Array.isArray(weaknesses) ? weaknesses : [];
            const referencesJson = JSON.stringify(references);
            
            console.log(`Processing CVE ${cveId} with weaknesses:`, weaknessesArray);
            
            // Construct array literal for PostgreSQL
            const weaknessesLiteral = '{' + weaknessesArray.map(w => `"${w?.replace(/"/g, '\\"') || ''}"`).join(',') + '}';
            
            await db.execute(sql`
              INSERT INTO vulnerabilities (
                id, description, published_date, last_modified_date, vuln_status,
                cvss_v3_score, cvss_v3_severity, cvss_v2_score, cvss_v2_severity,
                weaknesses, reference_urls
              )
              VALUES (
                ${cveId}, ${description}, ${cve.published}, ${cve.lastModified}, ${cve.vulnStatus},
                ${cvssV3Score ? cvssV3Score.toString() : null}, ${cvssV3Severity}, 
                ${cvssV2Score ? cvssV2Score.toString() : null}, ${cvssV2Severity},
                ${weaknessesLiteral}::text[], ${referencesJson}::jsonb
              )
            `);
            
            processedCount++;
            console.log(`Saved CVE: ${cveId}`);
          } else {
            console.log(`CVE already exists: ${cveId}`);
          }
        } catch (cveError) {
          console.error(`Failed to process CVE:`, cveError);
          errors.push(`Failed to process CVE: ${cveError instanceof Error ? cveError.message : 'Unknown error'}`);
        }
      }
    }
    
    console.log(`CVE fetch complete. Processed ${processedCount} new CVEs.`);
    res.json({ 
      message: `Successfully fetched ${processedCount} new CVEs`,
      totalProcessed: processedCount,
      totalFromAPI: nvdData.vulnerabilities?.length || 0,
      errors: errors.length > 0 ? errors.slice(0, 5) : [], // Return first 5 errors
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error fetching CVEs:", error);
    res.status(500).json({ 
      message: "Failed to fetch CVEs from NVD",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}