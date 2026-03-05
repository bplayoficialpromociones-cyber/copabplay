/*
  # Fix Rankings Table RLS Policies for Admin Panel

  1. Changes
    - Drop existing policies that require authenticated users for write operations
    - Create new policies that allow anonymous access for all operations
    - This is necessary because the admin panel uses a custom authentication system
      that doesn't create Supabase auth sessions

  2. Security Note
    - In production, you should implement proper authentication using Supabase Auth
    - This change allows anonymous access to match the current authentication pattern
    
  3. Impact
    - Allows admin panel to update rankings without Supabase auth
    - Enables real-time updates to work properly
    - Public frontend will receive instant updates when admin makes changes
*/

-- Drop existing write policies
DROP POLICY IF EXISTS "Authenticated users can insert rankings" ON rankings;
DROP POLICY IF EXISTS "Authenticated users can update rankings" ON rankings;
DROP POLICY IF EXISTS "Authenticated users can delete rankings" ON rankings;

-- Create new policies for anonymous access (for custom auth admin)
CREATE POLICY "Allow anonymous insert access to rankings"
  ON rankings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to rankings"
  ON rankings FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to rankings"
  ON rankings FOR DELETE
  TO anon
  USING (true);

-- Also allow authenticated users (for future use with proper Supabase auth)
CREATE POLICY "Allow authenticated insert access to rankings"
  ON rankings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update access to rankings"
  ON rankings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete access to rankings"
  ON rankings FOR DELETE
  TO authenticated
  USING (true);