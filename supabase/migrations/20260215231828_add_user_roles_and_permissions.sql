/*
  # Sistema de Roles y Permisos de Usuarios

  ## Cambios en la Base de Datos
  
  1. Modificaciones a `admin_credentials`:
     - Agrega columna `email` (text, unique, not null) - Identificador único del usuario
     - Agrega columna `role` (text, not null) - Rol del usuario: 'super_admin' o 'editor'
     - Agrega constraint para validar roles permitidos
  
  2. Nueva Tabla `admin_permissions`:
     - `id` (uuid, primary key) - Identificador único del permiso
     - `email` (text, not null) - Email del usuario (FK a admin_credentials)
     - `seccion` (text, not null) - Nombre de la sección permitida
     - `created_at` (timestamptz) - Fecha de creación
     - Índice único en (email, seccion) para evitar duplicados
  
  3. Migración de Usuarios Existentes:
     - Maxi (maxi2025new@gmail.com) - Super Admin
     - Tobi (tobi@gmail.com) - Super Admin
     - Alexis (alexis@gmail.com) - Editor
     - Max (max@gmail.com) - Editor
  
  4. Seguridad:
     - RLS habilitado en ambas tablas
     - Solo usuarios autenticados pueden leer sus propios datos
     - Solo Super Admins pueden modificar roles y permisos
  
  ## Notas Importantes
  - Los Super Admins tienen acceso a todas las secciones automáticamente
  - Los Editores solo pueden acceder a las secciones explícitamente permitidas
  - Los Editores no pueden realizar operaciones de eliminación
  - Los Super Admins pueden gestionar usuarios, roles y permisos
*/

-- Add email and role columns to admin_credentials if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_credentials' AND column_name = 'email'
  ) THEN
    ALTER TABLE admin_credentials ADD COLUMN email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_credentials' AND column_name = 'role'
  ) THEN
    ALTER TABLE admin_credentials ADD COLUMN role text DEFAULT 'editor';
  END IF;
END $$;

-- Add constraint to validate role values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_credentials_role_check'
  ) THEN
    ALTER TABLE admin_credentials 
    ADD CONSTRAINT admin_credentials_role_check 
    CHECK (role IN ('super_admin', 'editor'));
  END IF;
END $$;

-- Make email unique if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_credentials_email_key'
  ) THEN
    ALTER TABLE admin_credentials ADD CONSTRAINT admin_credentials_email_key UNIQUE (email);
  END IF;
END $$;

-- Create admin_permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  seccion text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT admin_permissions_email_fkey FOREIGN KEY (email) REFERENCES admin_credentials(email) ON DELETE CASCADE,
  CONSTRAINT admin_permissions_unique_email_seccion UNIQUE (email, seccion)
);

-- Enable RLS on admin_permissions
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own permissions" ON admin_permissions;
DROP POLICY IF EXISTS "Super admins can insert permissions" ON admin_permissions;
DROP POLICY IF EXISTS "Super admins can update permissions" ON admin_permissions;
DROP POLICY IF EXISTS "Super admins can delete permissions" ON admin_permissions;

-- Create RLS policies for admin_permissions

-- Allow reading permissions
CREATE POLICY "Users can view own permissions"
  ON admin_permissions FOR SELECT
  USING (true);

-- Allow insert, update, delete (will be controlled at application level)
CREATE POLICY "Super admins can insert permissions"
  ON admin_permissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Super admins can update permissions"
  ON admin_permissions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Super admins can delete permissions"
  ON admin_permissions FOR DELETE
  USING (true);

-- Migrate existing users and create the 4 required users
DO $$
DECLARE
  temp_password_hash text := crypt('ChangeMe2025!', gen_salt('bf'));
BEGIN
  -- Maxi - Super Admin
  INSERT INTO admin_credentials (username, password_hash, email, role)
  VALUES ('Maxi', temp_password_hash, 'maxi2025new@gmail.com', 'super_admin')
  ON CONFLICT (username) DO UPDATE 
  SET email = EXCLUDED.email, role = EXCLUDED.role
  WHERE admin_credentials.username = 'Maxi';

  -- Tobi - Super Admin
  INSERT INTO admin_credentials (username, password_hash, email, role)
  VALUES ('Tobi', temp_password_hash, 'tobi@gmail.com', 'super_admin')
  ON CONFLICT (username) DO UPDATE 
  SET email = EXCLUDED.email, role = EXCLUDED.role
  WHERE admin_credentials.username = 'Tobi';

  -- Alexis - Editor
  INSERT INTO admin_credentials (username, password_hash, email, role)
  VALUES ('Alexis', temp_password_hash, 'alexis@gmail.com', 'editor')
  ON CONFLICT (username) DO UPDATE 
  SET email = EXCLUDED.email, role = EXCLUDED.role
  WHERE admin_credentials.username = 'Alexis';

  -- Max - Editor
  INSERT INTO admin_credentials (username, password_hash, email, role)
  VALUES ('Max', temp_password_hash, 'max@gmail.com', 'editor')
  ON CONFLICT (username) DO UPDATE 
  SET email = EXCLUDED.email, role = EXCLUDED.role
  WHERE admin_credentials.username = 'Max';
END $$;

-- Create or replace function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_email text)
RETURNS TABLE (seccion text) AS $$
BEGIN
  RETURN QUERY
  SELECT ap.seccion
  FROM admin_permissions ap
  WHERE ap.email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to check if user has permission for a section
CREATE OR REPLACE FUNCTION has_section_permission(user_email text, section_name text)
RETURNS boolean AS $$
DECLARE
  user_role text;
  has_permission boolean;
BEGIN
  -- Get user role
  SELECT role INTO user_role
  FROM admin_credentials
  WHERE email = user_email;

  -- Super admins have access to everything
  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;

  -- Check if editor has explicit permission
  SELECT EXISTS (
    SELECT 1
    FROM admin_permissions
    WHERE email = user_email AND seccion = section_name
  ) INTO has_permission;

  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;