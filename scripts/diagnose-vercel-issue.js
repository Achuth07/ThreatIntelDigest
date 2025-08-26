#!/usr/bin/env node

/**
 * Diagnostic script for Vercel deployment issues
 * Run this script with your Vercel domain to check API connectivity
 * 
 * Usage: node scripts/diagnose-vercel-issue.js https://your-vercel-domain.vercel.app
 */

const domain = process.argv[2];

if (!domain) {
  console.error('❌ Please provide your Vercel domain');
  console.error('Usage: node scripts/diagnose-vercel-issue.js https://your-domain.vercel.app');
  process.exit(1);
}

async function checkAPI(endpoint, expectedStatusCode = 200) {
  try {
    console.log(`🔍 Testing ${endpoint}...`);
    
    const response = await fetch(`${domain}${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    const status = response.status;
    const isSuccess = status === expectedStatusCode;
    
    console.log(`${isSuccess ? '✅' : '❌'} ${endpoint} - Status: ${status}`);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      console.log(`   Data:`, JSON.stringify(data, null, 2));
      return data;
    } else {
      const text = await response.text();
      console.log(`   Response:`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      return text;
    }
  } catch (error) {
    console.log(`❌ ${endpoint} - Error: ${error.message}`);
    return null;
  }
}

async function initializeSources() {
  try {
    console.log(`🔄 Initializing default sources...`);
    
    const response = await fetch(`${domain}/api/initialize-sources`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    const status = response.status;
    const isSuccess = status === 200;
    
    console.log(`${isSuccess ? '✅' : '❌'} Initialize sources - Status: ${status}`);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      console.log(`   Result:`, JSON.stringify(data, null, 2));
      return data;
    } else {
      const text = await response.text();
      console.log(`   Response:`, text);
      return text;
    }
  } catch (error) {
    console.log(`❌ Initialize sources - Error: ${error.message}`);
    return null;
  }
}

async function diagnose() {
  console.log(`🚀 Diagnosing Vercel deployment for: ${domain}\n`);
  
  // Check if main site loads
  await checkAPI('/', 200);
  console.log('');
  
  // Check API endpoints
  console.log('📡 Testing API endpoints...');
  const sourcesData = await checkAPI('/api/sources');
  await checkAPI('/api/articles');
  console.log('');
  
  // If no sources found, try to initialize them
  if (sourcesData && Array.isArray(sourcesData) && sourcesData.length === 0) {
    console.log('📋 No RSS sources found, attempting to initialize...');
    await initializeSources();
    console.log('');
    
    // Recheck sources after initialization
    console.log('🔄 Rechecking sources after initialization...');
    await checkAPI('/api/sources');
  }
  
  console.log('\n🎯 Diagnosis complete!');
  console.log('\n💡 Common fixes:');
  console.log('1. Ensure DATABASE_URL is set in Vercel environment variables');
  console.log('2. Run database migrations: npm run db:push');
  console.log('3. Initialize sources by calling /api/initialize-sources endpoint');
  console.log('4. Check browser console for CORS or network errors');
}

diagnose().catch(console.error);