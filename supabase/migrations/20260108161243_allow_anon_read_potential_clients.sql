/*
  # Allow Anonymous Read Access to Potential Clients
  
  ## Purpose
  Allow the admin panel to read potential_clients data. The admin uses
  a custom authentication system (localStorage) that doesn't create a 
  Supabase session, so we need to allow anonymous reads.
  
  ## Changes
  1. Add SELECT policy for anon role
  
  ## Security Note
  This allows anyone with the anon key to read the potential clients table.
  In production, consider implementing proper Supabase Auth for admins.
*/

-- Allow anonymous users to read potential clients (for admin panel)
CREATE POLICY "anon_read_potential_clients"
  ON potential_clients
  FOR SELECT
  TO anon
  USING (true);
