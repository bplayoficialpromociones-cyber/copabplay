/*
  # Add Update Admin Password Function

  1. New Functions
    - `update_admin_password` - Allows updating admin password with encryption
    
  2. Security
    - Function is marked as SECURITY DEFINER to allow password updates
    - Uses crypt function to hash the new password
    - Only updates password for the specified username

  ## Important Notes
  - This function should only be called by authenticated admin users
  - The password is hashed using bcrypt before storage
  - The function returns a boolean indicating success
*/

CREATE OR REPLACE FUNCTION update_admin_password(
  admin_username text,
  new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_credentials
  SET password_hash = crypt(new_password, gen_salt('bf'))
  WHERE username = admin_username;
  
  RETURN FOUND;
END;
$$;