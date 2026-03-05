/*
  # Remove Restrictive Usuario Constraint from usuarios_emails

  1. Changes
    - Drop CHECK constraint that limits usuarios to specific names
    - Allow any usuario name to be used
    - This enables flexibility with admin_credentials usernames
  
  2. Security
    - Still maintains UNIQUE constraint on usuario
    - RLS policies remain in place
*/

-- Drop the existing CHECK constraint
ALTER TABLE usuarios_emails 
  DROP CONSTRAINT IF EXISTS usuarios_emails_usuario_check;

-- Keep the NOT NULL constraint but remove the restrictive CHECK
-- The usuario column will still be UNIQUE and NOT NULL