import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Initializing Threat Groups tables...");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing");
    process.exit(1);
  }

  const db = getDb();

  try {
    // Drop tables if they exist to ensure clean state with correct types
    await db.execute(sql`DROP TABLE IF EXISTS article_threat_groups`);
    await db.execute(sql`DROP TABLE IF EXISTS threat_groups`);
    console.log("Dropped existing threat tables");

    // Create threat_groups table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS threat_groups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        stix_id text NOT NULL UNIQUE,
        name text NOT NULL,
        description text,
        aliases jsonb DEFAULT '[]'::jsonb,
        last_updated timestamp,
        created_at timestamp DEFAULT now()
      );
    `);
    console.log("Created threat_groups table");

    // Create article_threat_groups table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS article_threat_groups (
        id serial PRIMARY KEY,
        article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        threat_group_id uuid NOT NULL REFERENCES threat_groups(id) ON DELETE CASCADE,
        created_at timestamp DEFAULT now()
      );
    `);
    console.log("Created article_threat_groups table");

    console.log("Tables initialized successfully!");
  } catch (error) {
    console.error("Error initializing tables:", error);
    process.exit(1);
  }
  process.exit(0);
}

main();
