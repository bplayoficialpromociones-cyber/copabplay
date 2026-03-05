/*
  # Fix Potential Clients RLS Policies
  
  ## Purpose
  Recreate RLS policies for potential_clients to ensure anonymous users
  can submit the form. The existing policies appear correct but are not working.
  
  ## Changes
  1. Drop existing INSERT policies
  2. Recreate INSERT policies with explicit permissions
  
  ## Security
  - Anonymous users can insert (submit form)
  - Authenticated users can insert (admins testing)
  - All other operations remain admin-only
*/

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Anyone can submit potential client form" ON potential_clients;
DROP POLICY IF EXISTS "Authenticated users can submit potential client form" ON potential_clients;

-- Recreate policy for anonymous users
CREATE POLICY "anon_insert_potential_clients"
  ON potential_clients
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Recreate policy for authenticated users  
CREATE POLICY "authenticated_insert_potential_clients"
  ON potential_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);