/*
  # Fix Foreign Key Constraint for Email Updates

  ## Changes

  1. Drop existing foreign key constraint in `admin_permissions`
  2. Add new constraint with `ON UPDATE CASCADE` to allow email updates

  ## Details

  This migration fixes the issue where updating a user's email in `admin_credentials`
  would fail because the foreign key constraint in `admin_permissions` didn't cascade updates.

  With `ON UPDATE CASCADE`, when an email is updated in `admin_credentials`,
  all references in `admin_permissions` will be automatically updated as well.
*/

-- Drop the existing foreign key constraint
ALTER TABLE admin_permissions
DROP CONSTRAINT IF EXISTS admin_permissions_email_fkey;

-- Add the new constraint with ON UPDATE CASCADE
ALTER TABLE admin_permissions
ADD CONSTRAINT admin_permissions_email_fkey
FOREIGN KEY (email)
REFERENCES admin_credentials(email)
ON DELETE CASCADE
ON UPDATE CASCADE;
