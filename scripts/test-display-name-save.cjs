const { Pool } = require('@neondatabase/serverless');
const crypto = require('crypto');
require('dotenv').config();

// Copy the token generation logic from API
function generateToken(payload) {
  const secret = process.env.SESSION_SECRET || 'fallback_secret_key_for_development_only';
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const fullPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000)
  };
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '');
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64').replace(/=/g, '');
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function testDisplayNameUpdate() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Get the first user
    const userResult = await pool.query('SELECT id, email, name FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.error('No users found in database');
      process.exit(1);
    }
    
    const user = userResult.rows[0];
    console.log('Testing with user:', user);
    
    // Generate token for this user
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      isAdmin: false
    });
    
    console.log('\nGenerated token:', token.substring(0, 50) + '...');
    
    // Simulate API request to save display name
    const displayName = 'Test User 123';
    console.log('\nAttempting to save display name:', displayName);
    
    // Make actual HTTP request to local server
    const response = await fetch('http://localhost:5001/api/user-preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        displayName: displayName
      })
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok) {
      console.log('\n✅ Display name saved successfully!');
      
      // Verify it was saved
      const checkResult = await pool.query(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [user.id]
      );
      console.log('\nSaved preferences:', checkResult.rows[0]);
    } else {
      console.log('\n❌ Failed to save display name');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testDisplayNameUpdate();
