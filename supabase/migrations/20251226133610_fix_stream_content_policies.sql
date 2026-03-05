/*
  # Fix Stream Content RLS Policies

  1. Changes
    - Drop existing policies that require authenticated users
    - Create new policies that allow anonymous access
    - This is necessary because the admin panel uses a custom authentication system
      that doesn't create Supabase auth sessions

  2. Security Note
    - In production, you should implement proper authentication using Supabase Auth
    - This change allows anonymous access to match the current authentication pattern
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read stream content" ON stream_content;
DROP POLICY IF EXISTS "Authenticated users can insert stream content" ON stream_content;
DROP POLICY IF EXISTS "Authenticated users can update stream content" ON stream_content;
DROP POLICY IF EXISTS "Authenticated users can delete stream content" ON stream_content;

-- Create new policies for anonymous access
CREATE POLICY "Allow anonymous read access to stream content"
  ON stream_content FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to stream content"
  ON stream_content FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to stream content"
  ON stream_content FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to stream content"
  ON stream_content FOR DELETE
  TO anon
  USING (true);

-- Also allow authenticated users (for future use)
CREATE POLICY "Allow authenticated read access to stream content"
  ON stream_content FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert access to stream content"
  ON stream_content FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update access to stream content"
  ON stream_content FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete access to stream content"
  ON stream_content FOR DELETE
  TO authenticated
  USING (true);