const { Pool } = require('pg');

// Load environment variables
require('dotenv').config();

async function checkColumns() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const client = await pool.connect();
    
    // Check if articles table exists and get its columns
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'articles' 
      ORDER BY ordinal_position
    `);
    
    console.log('Articles table columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });
    
    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();