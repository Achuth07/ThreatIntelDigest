const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

async function checkDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('Checking database tables...\n');
    
    // Check if user_preferences table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_preferences'
      );
    `);
    
    console.log('user_preferences table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Get table structure
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'user_preferences'
        ORDER BY ordinal_position;
      `);
      
      console.log('\nTable structure:');
      console.table(structure.rows);
      
      // Get row count
      const count = await pool.query('SELECT COUNT(*) FROM user_preferences');
      console.log('\nNumber of rows:', count.rows[0].count);
    } else {
      console.log('\n❌ Table does NOT exist! Migration did not run on Neon.');
    }
    
    // Check users table for reference
    console.log('\n--- Checking users table ---');
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log('Number of users:', usersCount.rows[0].count);
    
    const sampleUser = await pool.query('SELECT id, email, name FROM users LIMIT 1');
    if (sampleUser.rows.length > 0) {
      console.log('Sample user:', sampleUser.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
