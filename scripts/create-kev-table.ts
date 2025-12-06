import { config } from 'dotenv';
config();

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function createKevTable() {
    try {
        await sql`
      CREATE TABLE IF NOT EXISTS known_exploited_vulnerabilities (
        cve_id VARCHAR PRIMARY KEY,
        vendor_project TEXT NOT NULL,
        product TEXT NOT NULL,
        vulnerability_name TEXT NOT NULL,
        date_added TIMESTAMP NOT NULL,
        short_description TEXT NOT NULL,
        required_action TEXT NOT NULL,
        due_date TIMESTAMP,
        known_ransomware_campaign_use TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
        console.log('Table known_exploited_vulnerabilities created successfully!');
    } catch (error) {
        console.error('Error creating table:', error);
    }
}

createKevTable();
