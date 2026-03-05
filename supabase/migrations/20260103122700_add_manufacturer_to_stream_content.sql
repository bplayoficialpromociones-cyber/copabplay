/*
  # Add manufacturer field to stream_content

  1. Changes
    - Add manufacturer column to stream_content table
    - Manufacturer is required field with specific game providers
  
  2. Security
    - No changes to RLS policies needed
*/

-- Add manufacturer column
ALTER TABLE stream_content 
ADD COLUMN IF NOT EXISTS manufacturer text NOT NULL DEFAULT 'Pragmatic';

-- Remove default after adding column
ALTER TABLE stream_content 
ALTER COLUMN manufacturer DROP DEFAULT;
