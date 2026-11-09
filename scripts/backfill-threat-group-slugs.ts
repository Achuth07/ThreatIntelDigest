import 'dotenv/config';
import { getDb } from '../server/db';
import { assignMissingSlugs } from '../server/services/threat-group-slugs';

// One-off (safe to re-run): fills threat_groups.slug for groups that do not have one yet.
// Run migrations/005_add_slug_to_threat_groups.sql first.
(async () => {
  const db = await getDb();
  const assigned = await assignMissingSlugs(db);
  console.log(`Assigned ${assigned} slugs.`);
  process.exit(0);
})().catch((error) => {
  console.error('Slug backfill failed:', error);
  process.exit(1);
});
