/*
  # Corregir políticas de games_points para acceso del admin

  1. Cambios
    - Agregar políticas para permitir acceso anónimo (anon) a games_points
    - Esto permite que el admin panel pueda crear, actualizar y eliminar juegos
  
  2. Seguridad
    - Mantener políticas existentes para usuarios autenticados
    - Agregar políticas equivalentes para rol anónimo
    - INSERT: Permitir inserción anónima
    - UPDATE: Permitir actualización anónima
    - DELETE: Permitir eliminación anónima

  3. Notas Importantes
    - El admin panel usa el rol anónimo de Supabase (anon key)
    - Las políticas authenticated siguen vigentes para futuros usos
*/

-- Agregar política de inserción para usuarios anónimos
CREATE POLICY "Allow anonymous insert access to games points"
  ON games_points
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Agregar política de actualización para usuarios anónimos
CREATE POLICY "Allow anonymous update access to games points"
  ON games_points
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Agregar política de eliminación para usuarios anónimos
CREATE POLICY "Allow anonymous delete access to games points"
  ON games_points
  FOR DELETE
  TO anon
  USING (true);
