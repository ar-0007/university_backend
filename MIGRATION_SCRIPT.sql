-- Migration Script: Update field names from snake_case to camelCase
-- This script will rename columns in existing tables to match the application code

-- IMPORTANT: Run this script in your Supabase SQL editor
-- Make sure to backup your database before running this migration

BEGIN;

-- 1. Update users table: rename first_name and last_name to firstName and lastName
ALTER TABLE users 
RENAME COLUMN first_name TO firstName;

ALTER TABLE users 
RENAME COLUMN last_name TO lastName;

-- 2. Update instructors table: rename first_name and last_name to firstName and lastName
ALTER TABLE instructors 
RENAME COLUMN first_name TO firstName;

ALTER TABLE instructors 
RENAME COLUMN last_name TO lastName;

-- 3. Update any views or functions that reference the old column names
-- (Add any custom views or functions here if they exist)

-- 4. Verify the changes
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('users', 'instructors') 
    AND column_name IN ('firstName', 'lastName', 'first_name', 'last_name')
ORDER BY table_name, column_name;

COMMIT;

-- After running this migration, your database schema will match your application code
-- The validation errors should be resolved