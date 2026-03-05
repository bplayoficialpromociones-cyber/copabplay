/*
  # Update potential_clients table - Change tiene_cuenta_bplay to text
  
  ## Purpose
  Change the tiene_cuenta_bplay field from boolean to text to support three options:
  - "si" (Yes)
  - "no" (No)  
  - "no_recuerdo" (Don't remember)
  
  ## Changes
  1. Change tiene_cuenta_bplay column type from boolean to text
  2. Update existing data to match new format (true -> 'si', false -> 'no')
  
  ## Notes
  - This allows users to indicate if they don't remember having a bplay account
  - Backwards compatible - existing data is preserved
*/

-- First, update existing boolean values to text equivalents
-- Create a temporary text column
ALTER TABLE potential_clients ADD COLUMN IF NOT EXISTS tiene_cuenta_bplay_temp text;

-- Copy data converting boolean to text
UPDATE potential_clients 
SET tiene_cuenta_bplay_temp = CASE 
  WHEN tiene_cuenta_bplay = true THEN 'si'
  WHEN tiene_cuenta_bplay = false THEN 'no'
  ELSE 'no'
END;

-- Drop the old boolean column
ALTER TABLE potential_clients DROP COLUMN IF EXISTS tiene_cuenta_bplay;

-- Rename the temp column to the original name
ALTER TABLE potential_clients RENAME COLUMN tiene_cuenta_bplay_temp TO tiene_cuenta_bplay;

-- Make it NOT NULL with a default
ALTER TABLE potential_clients ALTER COLUMN tiene_cuenta_bplay SET NOT NULL;
ALTER TABLE potential_clients ALTER COLUMN tiene_cuenta_bplay SET DEFAULT 'no';
