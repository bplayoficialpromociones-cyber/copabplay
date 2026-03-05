/*
  # Add Comment Status Tracking

  1. Changes to `tarea_comentarios` table
    - Add `estado` column to track if comment is pending or resolved
    - Add `resuelto_por` to track who resolved the comment
    - Add `resuelto_fecha` to track when it was resolved
  
  2. Notes
    - Table already has `parent_comment_id` for threading
    - Default estado is 'pendiente' for new comments
  
  3. Security
    - Existing RLS policies will handle the new columns
*/

-- Add new columns to tarea_comentarios
DO $$
BEGIN
  -- Add estado column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tarea_comentarios' AND column_name = 'estado'
  ) THEN
    ALTER TABLE tarea_comentarios 
    ADD COLUMN estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'resuelto'));
  END IF;

  -- Add resuelto_por to track who resolved
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tarea_comentarios' AND column_name = 'resuelto_por'
  ) THEN
    ALTER TABLE tarea_comentarios 
    ADD COLUMN resuelto_por text;
  END IF;

  -- Add resuelto_fecha to track when resolved
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tarea_comentarios' AND column_name = 'resuelto_fecha'
  ) THEN
    ALTER TABLE tarea_comentarios 
    ADD COLUMN resuelto_fecha timestamptz;
  END IF;
END $$;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_tarea_comentarios_estado ON tarea_comentarios(estado);
CREATE INDEX IF NOT EXISTS idx_tarea_comentarios_tarea_estado ON tarea_comentarios(tarea_id, estado);

-- Add comments to explain the structure
COMMENT ON COLUMN tarea_comentarios.estado IS 'Estado del comentario: pendiente (esperando respuesta/acción) o resuelto (ya atendido)';
COMMENT ON COLUMN tarea_comentarios.resuelto_por IS 'Usuario que marcó el comentario como resuelto';
COMMENT ON COLUMN tarea_comentarios.resuelto_fecha IS 'Fecha y hora cuando se marcó como resuelto';