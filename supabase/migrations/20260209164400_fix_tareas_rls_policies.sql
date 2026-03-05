/*
  # Fix Tareas Table RLS Policies

  1. Changes
    - Drop existing restrictive RLS policies that require authenticated users
    - Create new policies that allow anonymous access for all operations
    - This matches the authentication pattern used in the rest of the application

  2. Security
    - Allow anonymous users to perform all CRUD operations on tareas table
    - This is consistent with the custom authentication system used in the admin panel
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read tareas" ON tareas;
DROP POLICY IF EXISTS "Allow authenticated users to insert tareas" ON tareas;
DROP POLICY IF EXISTS "Allow authenticated users to update tareas" ON tareas;
DROP POLICY IF EXISTS "Allow authenticated users to delete tareas" ON tareas;

-- Create new policies allowing anonymous access
CREATE POLICY "Allow anonymous to read tareas"
  ON tareas
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous to insert tareas"
  ON tareas
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous to update tareas"
  ON tareas
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous to delete tareas"
  ON tareas
  FOR DELETE
  TO anon
  USING (true);