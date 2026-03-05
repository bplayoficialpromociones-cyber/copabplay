/*
  # Create Tareas (Tasks) Table

  1. New Tables
    - `tareas`
      - `id` (bigint, primary key, auto-increment)
      - `nombre_tarea` (text) - Task name
      - `fecha_creacion` (timestamptz, default now()) - Creation date
      - `descripcion_tarea` (text) - Task description
      - `estado` (text) - Status: pendiente, resuelta, con bugs
      - `fecha_cierre` (timestamptz, nullable) - Close date
      - `asignada_a` (text) - Assigned to: Tobias, Max, Alexis, Maxi
      - `imagen_tarea` (text, nullable) - Image file URL
      - `video_tarea` (text, nullable) - Video file URL
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
  
  2. Security
    - Enable RLS on `tareas` table
    - Add policies for authenticated users (admin) to manage tasks
*/

CREATE TABLE IF NOT EXISTS tareas (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre_tarea text NOT NULL,
  fecha_creacion timestamptz DEFAULT now() NOT NULL,
  descripcion_tarea text NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'resuelta', 'con bugs')),
  fecha_cierre timestamptz,
  asignada_a text NOT NULL CHECK (asignada_a IN ('Tobias', 'Max', 'Alexis', 'Maxi')),
  imagen_tarea text,
  video_tarea text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read tareas"
  ON tareas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert tareas"
  ON tareas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update tareas"
  ON tareas
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete tareas"
  ON tareas
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tareas_estado ON tareas(estado);
CREATE INDEX IF NOT EXISTS idx_tareas_asignada_a ON tareas(asignada_a);
CREATE INDEX IF NOT EXISTS idx_tareas_fecha_creacion ON tareas(fecha_creacion DESC);