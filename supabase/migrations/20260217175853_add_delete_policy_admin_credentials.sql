/*
  # Add DELETE policy for admin_credentials

  1. Changes
    - Add DELETE policy to allow deletion of user accounts
    - This is needed for the Super Admin to delete users
    - The frontend will handle permission checks (only super_admin can delete)

  2. Security
    - Allow all authenticated requests to delete (frontend controls access)
    - User history (tasks, comments) will remain in the system
*/

-- Add DELETE policy for admin_credentials
CREATE POLICY "Allow delete on admin_credentials"
  ON admin_credentials FOR DELETE
  USING (true);
