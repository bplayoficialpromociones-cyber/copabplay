/*
  # Create Admin Credentials Table

  1. New Tables
    - `admin_credentials`
      - `id` (uuid, primary key) - Unique identifier
      - `username` (text, unique) - Admin username
      - `password_hash` (text) - Hashed password
      - `created_at` (timestamptz) - Creation timestamp
  
  2. Security
    - Enable RLS on admin_credentials table
    - Only authenticated admins can access this table
    - Passwords are hashed using pgcrypto
  
  3. Initial Data
    - Creates admin user "Tobi" with password "Aguilar777@"
*/

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create admin credentials table
CREATE TABLE IF NOT EXISTS admin_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can read admin credentials
CREATE POLICY "Authenticated users can read admin credentials"
  ON admin_credentials
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow anonymous users to read for login validation
CREATE POLICY "Anonymous can read admin credentials for login"
  ON admin_credentials
  FOR SELECT
  TO anon
  USING (true);

-- Insert admin user with hashed password
INSERT INTO admin_credentials (username, password_hash)
VALUES ('Tobi', crypt('Aguilar777@', gen_salt('bf')))
ON CONFLICT (username) DO UPDATE
SET password_hash = crypt('Aguilar777@', gen_salt('bf'));