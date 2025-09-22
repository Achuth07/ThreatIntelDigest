// Simple test script to verify Google OAuth configuration
import { config } from 'dotenv';
config();

console.log('Testing Google OAuth configuration...');

// Check if required environment variables are set
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'SESSION_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.log('❌ Missing environment variables:');
  missingEnvVars.forEach(envVar => console.log(`   - ${envVar}`));
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set');
}

console.log('\nEnvironment variables:');
console.log(`GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET'}`);
console.log(`GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET'}`);
console.log(`GOOGLE_CALLBACK_URL: ${process.env.GOOGLE_CALLBACK_URL || 'NOT SET'}`);
console.log(`SESSION_SECRET: ${process.env.SESSION_SECRET ? 'SET' : 'NOT SET'}`);

console.log('\n✅ Google OAuth configuration test completed successfully');