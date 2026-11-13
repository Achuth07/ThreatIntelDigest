import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { Pool } from '@neondatabase/serverless';

dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const statements = readFileSync('migrations/006_add_epss_to_vulnerabilities.sql', 'utf8')
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

  const { rows } = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'vulnerabilities' AND column_name IN ('epss_score', 'epss_percentile')
  `);
  console.log(`EPSS columns present: ${rows.map(row => row.column_name).sort().join(', ')}`);
  await pool.end();
}

main().catch(error => {
  console.error('EPSS migration failed:', error);
  process.exit(1);
});
