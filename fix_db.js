require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 1`;
  console.log("Column added");
}
main().catch(console.error);
