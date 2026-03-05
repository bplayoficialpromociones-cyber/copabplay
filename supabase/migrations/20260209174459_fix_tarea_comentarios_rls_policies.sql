/*
  # Fix Tarea Comentarios Table RLS Policies

  1. Changes
    - Drop existing restrictive RLS policies that require authenticated users
    - Create new policies that allow anonymous access for all operations
    - This matches the authentication pattern used in the rest of the application

  2. Security
    - Allow anonymous users to perform all CRUD operations on tarea_comentarios table
    - This is consistent with the custom authentication system used in the admin panel
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read all comments" ON tarea_comentarios;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON tarea_comentarios;
DROP POLICY IF EXISTS "Authenticated users can update comments" ON tarea_comentarios;

-- Create new policies allowing anonymous access
CREATE POLICY "Allow anonymous to read tarea_comentarios"
  ON tarea_comentarios
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous to insert tarea_comentarios"
  ON tarea_comentarios
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous to update tarea_comentarios"
  ON tarea_comentarios
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);