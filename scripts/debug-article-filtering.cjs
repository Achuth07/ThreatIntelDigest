require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function debugArticleFiltering() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('=== Debugging Article Filtering Issue ===\n');
  
  // 1. Check all sources in rss_sources
  console.log('1. All RSS Sources:');
  const allSources = await sql`SELECT id, name, url, is_active FROM rss_sources ORDER BY name`;
  allSources.forEach(s => console.log(`   - ID: ${s.id}, Name: ${s.name}, Active: ${s.is_active}`));
  
  console.log('\n2. Sample Articles (first 10):');
  const sampleArticles = await sql`SELECT id, title, source, published_at FROM articles ORDER BY published_at DESC LIMIT 10`;
  sampleArticles.forEach(a => console.log(`   - Source: "${a.source}", Title: ${a.title.substring(0, 60)}...`));
  
  // 3. Check user source preferences (assuming first user)
  console.log('\n3. User Source Preferences:');
  const userPrefs = await sql`
    SELECT usp.user_id, usp.source_id, usp.is_active, rs.name 
    FROM user_source_preferences usp
    LEFT JOIN rss_sources rs ON usp.source_id = rs.id
    ORDER BY usp.user_id, rs.name
  `;
  
  if (userPrefs.length === 0) {
    console.log('   No user preferences found!');
  } else {
    const groupedByUser = {};
    userPrefs.forEach(p => {
      if (!groupedByUser[p.user_id]) groupedByUser[p.user_id] = [];
      groupedByUser[p.user_id].push(p);
    });
    
    Object.entries(groupedByUser).forEach(([userId, prefs]) => {
      console.log(`   User ${userId}:`);
      prefs.forEach(p => {
        console.log(`     - Source ID: ${p.source_id}, Name: ${p.name}, Active: ${p.is_active}`);
      });
    });
  }
  
  // 4. Check article source values vs rss_sources IDs
  console.log('\n4. Unique article source values:');
  const uniqueSources = await sql`SELECT DISTINCT source FROM articles ORDER BY source`;
  uniqueSources.forEach(s => console.log(`   - "${s.source}"`));
  
  console.log('\n5. Mismatch check - Articles with sources not in rss_sources:');
  const mismatches = await sql`
    SELECT DISTINCT a.source 
    FROM articles a 
    WHERE NOT EXISTS (
      SELECT 1 FROM rss_sources rs WHERE rs.id = a.source
    )
    ORDER BY a.source
  `;
  
  if (mismatches.length === 0) {
    console.log('   ✓ All article sources match rss_sources IDs');
  } else {
    console.log('   ✗ Found mismatches:');
    mismatches.forEach(m => console.log(`     - "${m.source}"`));
  }
  
  console.log('\n=== End Debug ===');
}

debugArticleFiltering().catch(console.error);
