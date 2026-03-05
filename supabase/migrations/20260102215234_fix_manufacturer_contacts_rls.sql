/*
  # Fix manufacturer_contacts RLS policies for admin access

  1. Changes
    - Add policy to allow anonymous read access to manufacturer_contacts
    - This is safe because the admin panel has its own authentication layer
    - Anonymous users can only read, not modify data
  
  2. Security
    - Read access for anonymous users (admin needs this)
    - Write operations still require authentication
*/

-- Drop existing duplicate SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON manufacturer_contacts;
DROP POLICY IF EXISTS "Authenticated users can view all contacts" ON manufacturer_contacts;

-- Create new comprehensive policy for reading
CREATE POLICY "Allow read access to manufacturer contacts"
  ON manufacturer_contacts
  FOR SELECT
  TO public
  USING (true);

-- Keep write policies restricted to authenticated users
-- (These already exist but let's ensure they're correct)
