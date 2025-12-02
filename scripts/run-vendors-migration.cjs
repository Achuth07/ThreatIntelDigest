const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('DATABASE_URL environment variable is required');
        process.exit(1);
    }

    // Create a connection pool
    const pool = new Pool({ connectionString: databaseUrl });

    try {
        // Read the migration file
        const migrationPath = path.join(__dirname, '..', 'migrations', '004_add_vendors_to_vulnerabilities.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        // Split the migration into individual statements
        const statements = migrationSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log('Running migration: Add vendors column to vulnerabilities...');

        // Execute each statement
        for (const statement of statements) {
            console.log('Executing:', statement.substring(0, 80) + '...');
            await pool.query(statement);
        }

        console.log('Migration completed successfully!');
        console.log('The vendors column has been added to the vulnerabilities table.');
        console.log('You can now re-fetch CVEs to populate vendor information.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
