-- Migration: Add vendors column to vulnerabilities table
-- Date: 2025-12-02
-- Description: Add vendors column to store extracted vendor information from CPE data

-- Add vendors column to vulnerabilities table
ALTER TABLE vulnerabilities 
ADD COLUMN IF NOT EXISTS vendors JSONB DEFAULT '[]'::jsonb;

-- Add index on vendors for faster filtering
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_vendors ON vulnerabilities USING GIN (vendors);
