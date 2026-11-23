import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { refreshHubStats } from '../server/services/hub-data';

// Recomputes the top vendors and top CWEs behind /vendors and /cwe (WHA-24). Safe to re-run.
// Run migrations/009_hub_stats.sql and migrations/010_product_stats_and_cwe_vendors.sql first.
(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const result = await refreshHubStats(neon(process.env.DATABASE_URL));
  console.log(`Hub stats refreshed: ${result.vendors} vendors, ${result.cwes} CWEs, ${result.products} products.`);
  process.exit(0);
})().catch((error) => {
  console.error('Hub stats refresh failed:', error);
  process.exit(1);
});
