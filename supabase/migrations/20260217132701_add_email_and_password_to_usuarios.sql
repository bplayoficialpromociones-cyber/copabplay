/*
  # Agregar email y clave a usuarios

  1. Cambios
    - Agregar columna `email` (text, único, requerido)
    - Agregar columna `clave` (text, requerido) - se guardará encriptada con pgcrypto
    - Agregar índice único para email
  
  2. Seguridad
    - La clave se encriptará usando la extensión pgcrypto
    - El email debe ser único en el sistema
*/

-- Agregar columna email (permitir null temporalmente para usuarios existentes)
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS email text UNIQUE,
ADD COLUMN IF NOT EXISTS clave text;

-- Crear índice para email
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Función para encriptar contraseña al insertar o actualizar
CREATE OR REPLACE FUNCTION encrypt_usuario_password()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clave IS NOT NULL AND NEW.clave != OLD.clave THEN
    NEW.clave := crypt(NEW.clave, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para encriptar la contraseña automáticamente
DROP TRIGGER IF EXISTS encrypt_usuario_password_trigger ON usuarios;
CREATE TRIGGER encrypt_usuario_password_trigger
  BEFORE INSERT OR UPDATE OF clave ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_usuario_password();

-- Función para verificar contraseña de usuario
CREATE OR REPLACE FUNCTION verify_usuario_password(usuario_email text, password text)
RETURNS TABLE (id uuid, nombre text, email text, activo boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.nombre, u.email, u.activo
  FROM usuarios u
  WHERE u.email = usuario_email
    AND u.clave = crypt(password, u.clave)
    AND u.activo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;