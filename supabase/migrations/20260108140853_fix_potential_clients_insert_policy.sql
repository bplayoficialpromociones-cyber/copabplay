/*
  # Fix Potential Clients Insert Policy
  
  ## Purpose
  Allow both anonymous and authenticated users to submit the potential clients form.
  Previously only anonymous users could insert, which caused issues when admins 
  tested the form while logged in.
  
  ## Changes
  1. Add policy for authenticated users to insert into potential_clients
  
  ## Security
  - Maintains existing security: both anonymous and authenticated users can submit forms
  - Admin-only policies for update/delete remain unchanged
  
  ## Notes
  - This fixes the issue where form submissions fail when user is authenticated
  - The original anon-only policy is kept for true anonymous users
*/

-- Policy: Authenticated users can also insert (submit form while logged in)
CREATE POLICY "Authenticated users can submit potential client form"
  ON potential_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);