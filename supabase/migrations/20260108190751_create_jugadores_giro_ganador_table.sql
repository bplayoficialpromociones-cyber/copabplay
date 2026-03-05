/*
  # Create Jugadores Giro Ganador Table
  
  1. New Tables
    - `jugadores_giro_ganador`
      - `id` (uuid, primary key)
      - `numero` (integer) - Row number for display
      - `nombre` (text)
      - `apellido` (text)
      - `dni` (text)
      - `email` (text)
      - `celular` (text)
      - `afiliador` (text)
      - `ciudad` (text)
      - `provincia` (text)
      - `estado` (text)
      - `alias_bplay` (text)
      - `clave_bplay` (text)
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on `jugadores_giro_ganador` table
    - Add policies for authenticated users (admins)
*/

CREATE TABLE IF NOT EXISTS jugadores_giro_ganador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer,
  nombre text,
  apellido text,
  dni text,
  email text,
  celular text,
  afiliador text,
  ciudad text,
  provincia text,
  estado text,
  alias_bplay text,
  clave_bplay text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE jugadores_giro_ganador ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (admins) to read all records
CREATE POLICY "Admins can view all jugadores giro ganador"
  ON jugadores_giro_ganador
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users (admins) to insert records
CREATE POLICY "Admins can insert jugadores giro ganador"
  ON jugadores_giro_ganador
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users (admins) to update records
CREATE POLICY "Admins can update jugadores giro ganador"
  ON jugadores_giro_ganador
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users (admins) to delete records
CREATE POLICY "Admins can delete jugadores giro ganador"
  ON jugadores_giro_ganador
  FOR DELETE
  TO authenticated
  USING (true);