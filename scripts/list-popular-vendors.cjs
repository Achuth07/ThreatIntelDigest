const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

async function listPopularVendors() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('DATABASE_URL environment variable is required');
        process.exit(1);
    }

    const pool = new Pool({ connectionString: databaseUrl });

    try {
        console.log('Top 30 vendors by CVE count:\n');

        const query = `
      SELECT 
        jsonb_array_elements_text(vendors) as vendor,
        COUNT(*) as cve_count
      FROM vulnerabilities
      WHERE vendors IS NOT NULL 
      AND jsonb_array_length(vendors) > 0
      GROUP BY vendor
      ORDER BY cve_count DESC
      LIMIT 30
    `;

        const result = await pool.query(query);
        console.log('Vendor Name          | CVE Count');
        console.log('---------------------|----------');
        result.rows.forEach(row => {
            console.log(`${row.vendor.padEnd(20)} | ${row.cve_count}`);
        });

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

listPopularVendors();
