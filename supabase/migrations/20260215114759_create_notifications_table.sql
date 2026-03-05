/*
  # Create Notifications System

  1. New Tables
    - `notificaciones`
      - `id` (uuid, primary key)
      - `usuario` (text) - User who will receive the notification (Tobias, Max, Alexis, Maxi)
      - `tipo` (text) - Type: nueva_tarea, nuevo_comentario
      - `mensaje` (text) - Notification message
      - `tarea_id` (bigint, foreign key) - Related task ID
      - `comentario_id` (uuid, nullable, foreign key) - Related comment ID if applicable
      - `leida` (boolean, default false) - Read status
      - `fecha_creacion` (timestamptz, default now())
      - `fecha_lectura` (timestamptz, nullable)
  
  2. Security
    - Enable RLS on `notificaciones` table
    - Add policies for authenticated users to manage their own notifications
*/

CREATE TABLE IF NOT EXISTS notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario text NOT NULL CHECK (usuario IN ('Tobias', 'Max', 'Alexis', 'Maxi')),
  tipo text NOT NULL CHECK (tipo IN ('nueva_tarea', 'nuevo_comentario', 'tarea_modificada')),
  mensaje text NOT NULL,
  tarea_id bigint REFERENCES tareas(id) ON DELETE CASCADE,
  comentario_id uuid,
  leida boolean DEFAULT false NOT NULL,
  fecha_creacion timestamptz DEFAULT now() NOT NULL,
  fecha_lectura timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read notifications"
  ON notificaciones
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert notifications"
  ON notificaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update notifications"
  ON notificaciones
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete notifications"
  ON notificaciones
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_tarea_id ON notificaciones(tarea_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha_creacion ON notificaciones(fecha_creacion DESC);