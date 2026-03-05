/*
  # Fix admin_change_user_password to not affect activo status

  ## Problem
  When an admin changes a user's password via the admin panel, the user's
  `activo` field was being left as-is. If a user had activo=false for any
  reason, they could not login even after a password reset.

  ## Fix
  Update admin_change_user_password to always set activo=true when changing
  a password administratively — if an admin is resetting someone's password,
  the intent is clearly for that user to be able to log in.
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
  UPDATE admin_credentials
  SET 
    password_hash = crypt(p_new_password, gen_salt('bf')),
    activo = true
  WHERE username = p_username;

  RETURN FOUND;
END;
$$;
