-- Migration: Convert single domain field to domains array
-- This migration adds the new domains array column and migrates existing data

BEGIN;

-- Add the new domains column as an array
ALTER TABLE sites ADD COLUMN domains text[];

-- Migrate existing domain data to the new domains array
UPDATE sites SET domains = ARRAY[domain] WHERE domain IS NOT NULL;

-- Make the domains column NOT NULL now that data is migrated
ALTER TABLE sites ALTER COLUMN domains SET NOT NULL;

-- Drop the old domain column
ALTER TABLE sites DROP COLUMN domain;

-- Add a check constraint to ensure domains array is not empty
ALTER TABLE sites ADD CONSTRAINT sites_domains_not_empty CHECK (array_length(domains, 1) > 0);

COMMIT;