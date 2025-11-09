const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
require('dotenv').config();

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const migrationSql = fs.readFileSync('migrations/003_add_user_preferences_simple.sql', 'utf8');
    
    // Simple split by semicolon
    const statements = migrationSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log('Running user_preferences migration...');
    console.log(`Found ${statements.length} statements to execute\n`);
    
    for (const statement of statements) {
      const preview = statement.replace(/\s+/g, ' ').substring(0, 80);
      console.log(`Executing: ${preview}...`);
      await pool.query(statement);
    }

    console.log('✅ Migration completed successfully!');
    console.log('user_preferences table has been created.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('Table may already exist - checking...');
      try {
        const result = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'user_preferences'
          );
        `);
        if (result.rows[0].exists) {
          console.log('✅ user_preferences table already exists.');
        }
      } catch (checkError) {
        console.error('Error checking table existence:', checkError.message);
      }
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
