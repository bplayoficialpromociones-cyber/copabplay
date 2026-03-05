/*
  # Add Province Column to Rankings Table

  1. Changes
    - Add `province` column to `rankings` table to store player location
    - Column is optional (nullable) for backwards compatibility
  
  2. Notes
    - Existing data will have NULL province values
    - New imports can include province information
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rankings' AND column_name = 'province'
  ) THEN
    ALTER TABLE rankings ADD COLUMN province text;
  END IF;
END $$;