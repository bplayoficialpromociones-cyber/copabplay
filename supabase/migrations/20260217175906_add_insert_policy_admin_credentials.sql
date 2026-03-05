/*
  # Add INSERT policy for admin_credentials

  1. Changes
    - Add INSERT policy to allow creation of new user accounts
    - This is needed for creating new users from the admin panel

  2. Security
    - Allow all authenticated requests to insert (frontend controls access)
*/

-- Add INSERT policy for admin_credentials
CREATE POLICY "Allow insert on admin_credentials"
  ON admin_credentials FOR INSERT
  WITH CHECK (true);
