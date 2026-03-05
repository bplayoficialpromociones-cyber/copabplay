/*
  # Fix RLS policies for notification_logs

  1. Problema:
    - Las políticas RLS actuales requieren autenticación
    - Pero el sistema de tareas usa conexión anónima
    - Esto causa error 401 al intentar insertar logs

  2. Solución:
    - Permitir que usuarios anónimos inserten logs
    - Permitir que usuarios anónimos lean logs
*/

-- Drop políticas existentes
DROP POLICY IF EXISTS "Allow authenticated to insert logs" ON notification_logs;
DROP POLICY IF EXISTS "Allow authenticated to read logs" ON notification_logs;

-- Permitir a TODOS (anon y authenticated) insertar logs
CREATE POLICY "Allow insert logs"
  ON notification_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Permitir a TODOS leer logs
CREATE POLICY "Allow read logs"
  ON notification_logs
  FOR SELECT
  TO anon, authenticated
  USING (true);
