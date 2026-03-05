/*
  # Crear función para crear usuarios admin

  1. Función
    - `create_admin_user` - Crea un nuevo usuario con contraseña encriptada
    - Parámetros: username, email, password, role, activo
    - Retorna el email del usuario creado o NULL si hay error
*/

CREATE OR REPLACE FUNCTION create_admin_user(
  input_username TEXT,
  input_email TEXT,
  input_password TEXT,
  input_role TEXT DEFAULT 'editor',
  input_activo BOOLEAN DEFAULT TRUE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  -- Verificar que no exista el username o email
  IF EXISTS (SELECT 1 FROM admin_credentials WHERE username = input_username OR email = input_email) THEN
    RAISE EXCEPTION 'Usuario o email ya existe';
  END IF;

  -- Insertar el nuevo usuario con contraseña encriptada
  INSERT INTO admin_credentials (username, email, password_hash, role, activo)
  VALUES (
    input_username,
    input_email,
    crypt(input_password, gen_salt('bf')),
    input_role::text,
    input_activo
  );

  RETURN input_email;
END;
$$;