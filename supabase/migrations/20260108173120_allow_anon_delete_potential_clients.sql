/*
  # Allow Anonymous Delete Access to Potential Clients
  
  ## Purpose
  Allow the admin panel to delete potential_clients records. The admin uses
  a custom authentication system (localStorage) that doesn't create a 
  Supabase session, so we need to allow anonymous deletes.
  
  ## Changes
  1. Add DELETE policy for anon role
  
  ## Security Note
  This allows anyone with the anon key to delete potential clients records.
  In production, consider implementing proper Supabase Auth for admins.
*/

-- Allow anonymous users to delete potential clients (for admin panel)
CREATE POLICY "anon_delete_potential_clients"
  ON potential_clients
  FOR DELETE
  TO anon
  USING (true);
