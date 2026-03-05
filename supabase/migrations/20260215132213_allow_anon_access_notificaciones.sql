/*
  # Allow anonymous access to notificaciones table

  1. Changes
    - Add SELECT policy for anon role
    - Add INSERT policy for anon role
    - Add UPDATE policy for anon role

  2. Reason
    - Admin panel uses localStorage for authentication, not Supabase Auth
    - Need to allow anon access for notifications to work
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read notifications" ON notificaciones;
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON notificaciones;
DROP POLICY IF EXISTS "Allow authenticated users to update notifications" ON notificaciones;
DROP POLICY IF EXISTS "Allow authenticated users to delete notifications" ON notificaciones;

-- Create new policies for anon access
CREATE POLICY "Allow anon to read notificaciones"
  ON notificaciones
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert notificaciones"
  ON notificaciones
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update notificaciones"
  ON notificaciones
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to delete notificaciones"
  ON notificaciones
  FOR DELETE
  TO anon
  USING (true);
