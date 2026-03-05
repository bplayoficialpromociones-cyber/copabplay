/*
  # Add Admin Change Password Function

  1. New Functions
    - `admin_change_user_password` - Allows super admins to change any user's password without requiring the old password

  2. Security
    - Function is marked as SECURITY DEFINER
    - Uses crypt function to hash the new password
    - Only updates password for the specified username

  ## Important Notes
  - This function should only be called by super admin users
  - No old password verification required (administrative function)
  - The password is hashed using bcrypt before storage
  - Returns a boolean indicating success
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
  -- Update the password
  UPDATE admin_credentials
  SET password = crypt(p_new_password, gen_salt('bf'))
  WHERE username = p_username;

  RETURN FOUND;
END;
$$;