const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

async function checkVendors() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('DATABASE_URL environment variable is required');
        process.exit(1);
    }

    const pool = new Pool({ connectionString: databaseUrl });

    try {
        console.log('Checking vendors in database...\n');

        // Get a sample of CVEs with vendors
        const sampleQuery = `
      SELECT id, vendors 
      FROM vulnerabilities 
      WHERE vendors IS NOT NULL 
      AND jsonb_array_length(vendors) > 0
      LIMIT 10
    `;

        const sampleResult = await pool.query(sampleQuery);
        console.log('Sample CVEs with vendors:');
        console.log(JSON.stringify(sampleResult.rows, null, 2));
        console.log('\n');

        // Get unique vendors
        const vendorsQuery = `
      SELECT DISTINCT jsonb_array_elements_text(vendors) as vendor
      FROM vulnerabilities
      WHERE vendors IS NOT NULL 
      AND jsonb_array_length(vendors) > 0
      ORDER BY vendor
      LIMIT 50
    `;

        const vendorsResult = await pool.query(vendorsQuery);
        console.log(`Found ${vendorsResult.rows.length} unique vendors (showing first 50):`);
        vendorsResult.rows.forEach(row => {
            console.log(`  - ${row.vendor}`);
        });
        console.log('\n');

        // Count CVEs with vendors
        const countQuery = `
      SELECT 
        COUNT(*) as total_cves,
        COUNT(CASE WHEN vendors IS NOT NULL AND jsonb_array_length(vendors) > 0 THEN 1 END) as cves_with_vendors
      FROM vulnerabilities
    `;

        const countResult = await pool.query(countQuery);
        console.log('Statistics:');
        console.log(`  Total CVEs: ${countResult.rows[0].total_cves}`);
        console.log(`  CVEs with vendors: ${countResult.rows[0].cves_with_vendors}`);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

checkVendors();
