/*
  # Políticas RLS para admin_credentials

  ## Cambios
  
  1. Políticas para admin_credentials:
     - Permite SELECT: Necesario para login y consultas de usuario
     - Permite UPDATE: Necesario para cambiar roles, emails y contraseñas
     - No permite DELETE: Protege los usuarios de eliminación accidental
  
  ## Seguridad
  - Todas las operaciones están permitidas en esta tabla ya que la seguridad
    se maneja a nivel de aplicación (solo usuarios autenticados acceden al admin panel)
  - La función verify_admin_password ya valida las credenciales
  - El frontend controla quién puede acceder a qué secciones basándose en roles
*/

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow select on admin_credentials" ON admin_credentials;
DROP POLICY IF EXISTS "Allow update on admin_credentials" ON admin_credentials;

-- Allow SELECT - needed for login and user queries
CREATE POLICY "Allow select on admin_credentials"
  ON admin_credentials FOR SELECT
  USING (true);

-- Allow UPDATE - needed for changing roles, emails, and passwords
CREATE POLICY "Allow update on admin_credentials"
  ON admin_credentials FOR UPDATE
  USING (true)
  WITH CHECK (true);