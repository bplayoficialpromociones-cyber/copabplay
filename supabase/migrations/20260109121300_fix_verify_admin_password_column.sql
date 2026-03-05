/*
  # Fix verify_admin_password Function
  
  1. Updates
    - Fix verify_admin_password to use correct column name (password_hash instead of password)
    - Ensures the function works correctly with the admin_credentials table structure
*/

-- Recreate verify_admin_password with correct column name
CREATE OR REPLACE FUNCTION verify_admin_password(input_username TEXT, input_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  stored_password TEXT;
BEGIN
  SELECT password_hash INTO stored_password
  FROM admin_credentials
  WHERE username = input_username;
  
  IF stored_password IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_password = crypt(input_password, stored_password);
END;
$$;
