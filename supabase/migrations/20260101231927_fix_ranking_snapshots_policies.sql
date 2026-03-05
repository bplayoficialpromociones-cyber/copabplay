/*
  # Corregir políticas de ranking_snapshots para acceso anónimo

  1. Cambios
    - Agregar políticas para permitir acceso anónimo (anon) a ranking_snapshots
    - Esto permite que el admin panel (que usa el rol anon) pueda crear, leer y eliminar snapshots
  
  2. Seguridad
    - Mantener políticas existentes para usuarios autenticados
    - Agregar políticas equivalentes para rol anónimo
    - SELECT: Lectura pública
    - INSERT: Permitir inserción anónima
    - DELETE: Permitir eliminación anónima

  3. Notas Importantes
    - El admin panel usa el rol anónimo de Supabase (anon key)
    - Las políticas authenticated siguen vigentes para futuros usos
*/

-- Agregar política de lectura para usuarios anónimos
CREATE POLICY "Allow anonymous read access to ranking snapshots"
  ON ranking_snapshots
  FOR SELECT
  TO anon
  USING (true);

-- Agregar política de inserción para usuarios anónimos
CREATE POLICY "Allow anonymous insert access to ranking snapshots"
  ON ranking_snapshots
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Agregar política de eliminación para usuarios anónimos
CREATE POLICY "Allow anonymous delete access to ranking snapshots"
  ON ranking_snapshots
  FOR DELETE
  TO anon
  USING (true);
