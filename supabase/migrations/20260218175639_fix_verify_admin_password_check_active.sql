/*
  # Fix verify_admin_password to check active status

  ## Changes
  
  1. Updates to verify_admin_password function:
     - Add verification for activo = true
     - Returns FALSE if user is inactive
     - Ensures only active users can login
  
  ## Security
  - Prevents inactive users from accessing the system
  - Maintains backward compatibility with existing password verification
*/

-- Update verify_admin_password function to check active status
CREATE OR REPLACE FUNCTION verify_admin_password(input_username TEXT, input_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  stored_password TEXT;
  user_active BOOLEAN;
BEGIN
  SELECT password_hash, activo INTO stored_password, user_active
  FROM admin_credentials
  WHERE username = input_username;
  
  -- Return FALSE if user doesn't exist
  IF stored_password IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Return FALSE if user is inactive
  IF user_active IS NULL OR user_active = FALSE THEN
    RETURN FALSE;
  END IF;
  
  -- Verify password
  RETURN stored_password = crypt(input_password, stored_password);
END;
$$;