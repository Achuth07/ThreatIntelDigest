import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { Pool } from '@neondatabase/serverless';

dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const statements = readFileSync('migrations/011_vendor_product_catalog.sql', 'utf8')
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

  const { rows } = await pool.query(`SELECT to_regclass('public.cve_products') AS t`);
  console.log(`catalog table present: ${rows[0].t !== null}`);
  await pool.end();
}

main().catch(error => {
  console.error('catalog migration failed:', error);
  process.exit(1);
});
