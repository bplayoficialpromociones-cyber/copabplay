/*
  # Fix verify_admin_password to use pgcrypto extension
  
  1. Updates
    - Update search_path to include extensions schema where pgcrypto is installed
    - Ensures crypt() function is accessible
*/

-- Recreate verify_admin_password with correct search_path for pgcrypto
CREATE OR REPLACE FUNCTION verify_admin_password(input_username TEXT, input_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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

-- Also update update_admin_password function
CREATE OR REPLACE FUNCTION update_admin_password(
  input_username TEXT,
  old_password TEXT,
  new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  password_valid BOOLEAN;
BEGIN
  password_valid := verify_admin_password(input_username, old_password);
  
  IF NOT password_valid THEN
    RETURN FALSE;
  END IF;
  
  UPDATE admin_credentials
  SET password_hash = crypt(new_password, gen_salt('bf'))
  WHERE username = input_username;
  
  RETURN TRUE;
END;
$$;
