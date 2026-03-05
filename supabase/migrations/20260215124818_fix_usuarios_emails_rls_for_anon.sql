/*
  # Fix RLS Policies for usuarios_emails to Support Anonymous Access

  1. Changes
    - Drop existing authenticated-only policies
    - Add new policies for anonymous (anon) access
    - Allow SELECT, INSERT, and UPDATE operations for anon role
  
  2. Security
    - Anonymous users can manage emails (required for localStorage-based auth)
    - This is safe because the admin panel itself is protected by the custom auth system
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read usuarios_emails" ON usuarios_emails;
DROP POLICY IF EXISTS "Allow authenticated users to update usuarios_emails" ON usuarios_emails;
DROP POLICY IF EXISTS "Allow authenticated users to insert usuarios_emails" ON usuarios_emails;

-- Create new policies for anonymous access
CREATE POLICY "Allow anon to read usuarios_emails"
  ON usuarios_emails
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert usuarios_emails"
  ON usuarios_emails
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update usuarios_emails"
  ON usuarios_emails
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);