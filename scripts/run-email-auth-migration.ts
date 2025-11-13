#!/usr/bin/env node

/**
 * Run Email Authentication Migration
 * This script executes the SQL migration to add email/password authentication support
 */

import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

async function runMigration() {
  console.log('🔄 Starting email authentication migration...\n');

  // Check if DATABASE_URL is configured
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    console.error('   Please configure your Neon PostgreSQL connection string in .env file');
    process.exit(1);
  }

  // Create database connection
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Read migration SQL file
    const migrationPath = join(__dirname, '..', 'migrations', '003_email_authentication.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration file loaded: migrations/003_email_authentication.sql\n');
    console.log('📊 Executing migration steps:\n');
    
    // Parse migration file to extract steps with descriptions
    const lines = migrationSQL.split('\n');
    const steps: { description: string; sql: string }[] = [];
    let currentDescription = '';
    let currentSQL = '';
    
    for (const line of lines) {
      if (line.trim().startsWith('-- Step')) {
        if (currentSQL.trim()) {
          steps.push({ description: currentDescription, sql: currentSQL.trim() });
        }
        currentDescription = line.replace(/^-- Step \d+: /, '').trim();
        currentSQL = '';
      } else if (!line.trim().startsWith('--') && line.trim()) {
        currentSQL += line + '\n';
      }
    }
    
    // Add last step
    if (currentSQL.trim()) {
      steps.push({ description: currentDescription, sql: currentSQL.trim() });
    }
    
    // Execute each step
    for (let i = 0; i < steps.length; i++) {
      const { description, sql } = steps[i];
      try {
        console.log(`   ${i + 1}. ${description}...`);
        await pool.query(sql);
        console.log(`   ✅ Success\n`);
      } catch (error: any) {
        // Check if error is because constraint/column already exists
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.code === '42P07' || // duplicate table
            error.code === '42701' || // duplicate column
            error.code === '42710') { // duplicate object
          console.log(`   ⚠️  Already exists (skipping)\n`);
        } else {
          console.error(`   ❌ Failed: ${error.message}\n`);
          throw error;
        }
      }
    }
    
    // Verify migration
    console.log('🔍 Verifying migration...\n');
    
    const verifyQuery = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN (
        'password_hash', 
        'email_verified', 
        'verification_token', 
        'verification_token_expiry',
        'reset_token',
        'reset_token_expiry'
      )
      ORDER BY column_name;
    `;
    
    const result = await pool.query(verifyQuery);
    
    if (result.rows.length === 6) {
      console.log('✅ All email authentication columns created successfully:\n');
      result.rows.forEach((row: any) => {
        console.log(`   • ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('⚠️  Warning: Expected 6 columns, found', result.rows.length);
    }
    
    // Check indexes
    console.log('\n🔍 Verifying indexes...\n');
    const indexQuery = `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'users' 
      AND indexname LIKE 'idx_users_%';
    `;
    
    const indexResult = await pool.query(indexQuery);
    console.log(`✅ Found ${indexResult.rows.length} indexes:\n`);
    indexResult.rows.forEach((row: any) => {
      console.log(`   • ${row.indexname}`);
    });
    
    // Check existing users
    console.log('\n📊 Checking existing users...\n');
    const usersQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(google_id) as google_users,
        COUNT(password_hash) as email_users,
        SUM(CASE WHEN email_verified THEN 1 ELSE 0 END) as verified_users
      FROM users;
    `;
    
    const usersResult = await pool.query(usersQuery);
    const stats = usersResult.rows[0];
    console.log(`   Total users: ${stats.total_users}`);
    console.log(`   Google OAuth users: ${stats.google_users}`);
    console.log(`   Email/password users: ${stats.email_users}`);
    console.log(`   Verified emails: ${stats.verified_users}`);
    
    console.log('\n✅ Migration completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Set MAILERSEND_API_KEY in .env file');
    console.log('   2. Configure MailerSend templates (see EMAIL_AUTH_DATABASE_MIGRATION.md)');
    console.log('   3. Test registration flow: npm run dev');
    console.log('   4. Register a test user and verify email\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration().catch(console.error);
