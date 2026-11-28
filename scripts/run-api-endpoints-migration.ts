import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { Pool } from '@neondatabase/serverless';

dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const statements = readFileSync('migrations/016_api_kev_actor_news_indexes.sql', 'utf8')
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    const started = Date.now();
    console.log(`Running: ${statement.split('\n')[0]}`);
    await pool.query(statement);
    console.log(`  done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }

  const { rows } = await pool.query(`
    SELECT i.indexrelname AS name, pg_size_pretty(pg_relation_size(i.indexrelid)) AS size, x.indisvalid AS valid
    FROM pg_stat_user_indexes i JOIN pg_index x ON x.indexrelid = i.indexrelid
    WHERE i.relname IN ('known_exploited_vulnerabilities', 'article_threat_groups') ORDER BY 1
  `);
  console.table(rows);
  const invalid = rows.filter(row => !row.valid);
  if (invalid.length) throw new Error(`Invalid indexes: ${invalid.map(row => row.name).join(', ')}`);
  const { rows: [db] } = await pool.query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`);
  console.log(`Database size: ${db.size}`);
  await pool.end();
}

main().catch(error => {
  console.error('KEV, actor and news index migration failed:', error);
  process.exit(1);
});
