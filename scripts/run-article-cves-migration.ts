import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { Pool } from '@neondatabase/serverless';

dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const statements = readFileSync('migrations/007_article_cves.sql', 'utf8')
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    console.log(`Running: ${statement.split('\n')[0]}`);
    await pool.query(statement);
  }

  const { rows } = await pool.query(`SELECT to_regclass('public.article_cves') AS t`);
  console.log(`article_cves table present: ${rows[0].t !== null}`);
  await pool.end();
}

main().catch(error => {
  console.error('article_cves migration failed:', error);
  process.exit(1);
});
