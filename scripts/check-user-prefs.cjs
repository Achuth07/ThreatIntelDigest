require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function fixUserPreferences() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('=== Checking User Source Preferences ===\n');
  
  // Get all users and their preferences
  const users = await sql`
    SELECT u.id, u.email, u.name,
           COUNT(usp.source_id) as total_prefs,
           COUNT(CASE WHEN usp.is_active = true THEN 1 END) as active_prefs
    FROM users u
    LEFT JOIN user_source_preferences usp ON u.id = usp.user_id
    GROUP BY u.id, u.email, u.name
  `;
  
  console.log('Users and their source preferences:');
  users.forEach(u => {
    console.log(`  ${u.email}: ${u.active_prefs} active / ${u.total_prefs} total`);
  });
  
  // Show which specific sources each user has
  console.log('\nDetailed source preferences:');
  const allPrefs = await sql`
    SELECT u.email, rs.name as source_name, usp.is_active
    FROM user_source_preferences usp
    JOIN users u ON usp.user_id = u.id
    JOIN rss_sources rs ON usp.source_id = rs.id
    ORDER BY u.email, rs.name
  `;
  
  const grouped = {};
  allPrefs.forEach(p => {
    if (!grouped[p.email]) grouped[p.email] = [];
    grouped[p.email].push(`${p.source_name} (${p.is_active ? 'ACTIVE' : 'inactive'})`);
  });
  
  Object.entries(grouped).forEach(([email, sources]) => {
    console.log(`\n  ${email}:`);
    sources.forEach(s => console.log(`    - ${s}`));
  });
  
  console.log('\n=== End ===');
}

fixUserPreferences().catch(console.error);
