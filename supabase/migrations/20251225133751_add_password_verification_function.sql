/*
  # Add Password Verification Function

  1. New Functions
    - `verify_admin_password` - Verifies admin password using bcrypt
  
  2. Security
    - Function is available to anonymous users for login
    - Uses pgcrypto's crypt function for secure comparison
  
  3. Notes
    - This function is used during admin login
    - Returns boolean indicating if password is correct
*/

-- Create function to verify admin password
CREATE OR REPLACE FUNCTION verify_admin_password(
  input_username text,
  input_password text
)
RETURNS boolean AS $$
DECLARE
  stored_hash text;
BEGIN
  -- Get the stored password hash
  SELECT password_hash INTO stored_hash
  FROM admin_credentials
  WHERE username = input_username;
  
  -- If user not found, return false
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verify password using crypt
  RETURN stored_hash = crypt(input_password, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;