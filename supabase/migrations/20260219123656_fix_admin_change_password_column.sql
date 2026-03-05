/*
  # Fix Admin Change Password Function - Column Name

  1. Changes
    - Fix column name from 'password' to 'password_hash' in admin_change_user_password function

  2. Security
    - Function is marked as SECURITY DEFINER
    - Uses crypt function to hash the new password
    - Only updates password_hash for the specified username
*/

CREATE OR REPLACE FUNCTION admin_change_user_password(
  p_username TEXT,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  -- Update the password_hash (not password)
  UPDATE admin_credentials
  SET password_hash = crypt(p_new_password, gen_salt('bf'))
  WHERE username = p_username;

  RETURN FOUND;
END;
$$;