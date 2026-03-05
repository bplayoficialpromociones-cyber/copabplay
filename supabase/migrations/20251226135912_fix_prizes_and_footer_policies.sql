/*
  # Fix Prizes and Footer Content RLS Policies

  1. Changes
    - Drop existing UPDATE policies that require authenticated users
    - Create new policies that allow anonymous access for UPDATE operations
    - This is necessary because the admin panel uses custom authentication
      that doesn't create Supabase auth sessions

  2. Security Note
    - In production, you should implement proper authentication using Supabase Auth
    - This change allows anonymous access to match the current authentication pattern

  3. Impact
    - Allows admin panel to update prizes and footer content without Supabase auth
    - Enables real-time updates to work properly
    - Public frontend will receive instant updates when admin makes changes
*/

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Authenticated users can update prizes" ON prizes_config;
DROP POLICY IF EXISTS "Authenticated users can update footer" ON footer_content;

-- Create new policies for anonymous access to prizes_config
CREATE POLICY "Allow anonymous update access to prizes"
  ON prizes_config FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update access to prizes"
  ON prizes_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create new policies for anonymous access to footer_content
CREATE POLICY "Allow anonymous update access to footer"
  ON footer_content FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update access to footer"
  ON footer_content FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);