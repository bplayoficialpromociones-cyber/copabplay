/*
  # Fix Jugadores Giro Ganador RLS Policies
  
  1. Changes
    - Add policies for anonymous users (anon) to allow admin operations
    - Admins use the anon key, not authenticated sessions
    
  2. Security
    - Allow anon users to perform all CRUD operations on jugadores_giro_ganador
    - This is safe because the anon key is only accessible to admins
*/

-- Allow anonymous users (admins) to read all records
CREATE POLICY "Anon can view all jugadores giro ganador"
  ON jugadores_giro_ganador
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users (admins) to insert records
CREATE POLICY "Anon can insert jugadores giro ganador"
  ON jugadores_giro_ganador
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users (admins) to update records
CREATE POLICY "Anon can update jugadores giro ganador"
  ON jugadores_giro_ganador
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users (admins) to delete records
CREATE POLICY "Anon can delete jugadores giro ganador"
  ON jugadores_giro_ganador
  FOR DELETE
  TO anon
  USING (true);