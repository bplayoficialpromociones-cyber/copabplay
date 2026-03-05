/*
  # Consolidar usuarios en admin_credentials

  1. Objetivo
    - Eliminar duplicación de tablas de usuarios
    - Migrar datos de usuarios a admin_credentials
    - Agregar campo activo a admin_credentials
    - Actualizar constraints y foreign keys
  
  2. Cambios
    - Agregar campo activo a admin_credentials
    - Migrar usuarios que no existen en admin_credentials
    - Eliminar constraint de foreign key en notificaciones
    - Eliminar tabla usuarios_emails (redundante)
*/

-- Agregar campo activo a admin_credentials
ALTER TABLE admin_credentials 
ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;

-- Migrar usuarios de la tabla usuarios que no existen en admin_credentials
-- Usar username como nombre, email como email, y clave como password
INSERT INTO admin_credentials (username, email, password_hash, role, activo, created_at)
SELECT 
  u.nombre,
  u.email,
  u.clave, -- Ya está encriptada
  'editor'::text, -- Rol por defecto
  u.activo,
  u.created_at
FROM usuarios u
WHERE NOT EXISTS (
  SELECT 1 FROM admin_credentials ac 
  WHERE LOWER(ac.username) = LOWER(u.nombre)
)
AND u.email IS NOT NULL
ON CONFLICT (username) DO NOTHING;

-- Actualizar usuarios existentes en admin_credentials con el campo activo de usuarios
UPDATE admin_credentials ac
SET activo = u.activo
FROM usuarios u
WHERE LOWER(ac.username) = LOWER(u.nombre);

-- Eliminar constraint de foreign key en notificaciones que apunta a usuarios
ALTER TABLE notificaciones
DROP CONSTRAINT IF EXISTS notificaciones_usuario_fkey;

-- Crear nueva constraint que valide que el usuario existe en admin_credentials
-- Pero no como foreign key para evitar problemas de cascada
CREATE OR REPLACE FUNCTION validate_usuario_exists()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM admin_credentials 
    WHERE username = NEW.usuario AND activo = true
  ) THEN
    RAISE EXCEPTION 'Usuario % no existe o no está activo', NEW.usuario;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_usuario_trigger ON notificaciones;
CREATE TRIGGER validate_usuario_trigger
  BEFORE INSERT OR UPDATE OF usuario ON notificaciones
  FOR EACH ROW
  EXECUTE FUNCTION validate_usuario_exists();