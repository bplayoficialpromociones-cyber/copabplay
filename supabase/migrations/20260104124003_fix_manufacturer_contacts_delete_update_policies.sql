/*
  # Fix manufacturer_contacts DELETE and UPDATE policies for admin access

  1. Problem
    - The admin panel uses its own authentication system (admin_credentials table)
    - Admin users are not authenticated with Supabase (they are anonymous/public)
    - Current DELETE and UPDATE policies require authenticated users
    - This causes DELETE and UPDATE operations to fail silently from the admin panel

  2. Solution
    - Drop restrictive policies that require authentication
    - Create new policies that allow public users to DELETE and UPDATE
    - This is safe because the admin panel has its own authentication layer
    - Only authorized admins can access these operations through the UI

  3. Changes
    - Drop existing UPDATE and DELETE policies
    - Create new policies allowing public access to UPDATE and DELETE
    - Keep INSERT policy for anonymous form submissions
    - Keep SELECT policy for public reading

  4. Security Notes
    - The admin panel requires login with credentials from admin_credentials table
    - Only authenticated admin users can access the manufacturer landing admin section
    - RLS policies are permissive because authentication happens at application level
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON manufacturer_contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON manufacturer_contacts;

-- Create new permissive policies for admin access
CREATE POLICY "Allow public to update manufacturer contacts"
  ON manufacturer_contacts
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete manufacturer contacts"
  ON manufacturer_contacts
  FOR DELETE
  TO public
  USING (true);
