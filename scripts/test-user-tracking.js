// Simple test script to verify user tracking functionality
import { existsSync } from 'fs';
import { join } from 'path';

const userTrackingPath = join(process.cwd(), 'server', 'user-tracking.ts');
const userStatsApiPath = join(process.cwd(), 'api', 'user-stats.ts');
const usersApiPath = join(process.cwd(), 'api', 'users.ts');

console.log('Checking user tracking implementation...');

// Check if user tracking file exists
if (existsSync(userTrackingPath)) {
  console.log('✓ User tracking module exists');
} else {
  console.log('✗ User tracking module does not exist');
}

// Check if API endpoints exist
if (existsSync(userStatsApiPath)) {
  console.log('✓ User statistics API endpoint exists');
} else {
  console.log('✗ User statistics API endpoint does not exist');
}

if (existsSync(usersApiPath)) {
  console.log('✓ Users API endpoint exists');
} else {
  console.log('✗ Users API endpoint does not exist');
}

// Check if schema has users table
const schemaPath = join(process.cwd(), 'shared', 'schema.ts');
if (existsSync(schemaPath)) {
  try {
    const schemaContent = await import('../shared/schema.ts');
    if (schemaContent.users) {
      console.log('✓ Users table defined in schema');
    } else {
      console.log('✗ Users table not found in schema');
    }
  } catch (error) {
    console.log('⚠ Could not check schema content:', error.message);
  }
} else {
  console.log('✗ Schema file does not exist');
}

console.log('User tracking test completed.');