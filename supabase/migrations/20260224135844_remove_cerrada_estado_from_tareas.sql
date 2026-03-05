/*
  # Remove 'cerrada' state from tareas

  'cerrada' is equivalent to 'resuelta', so it's being consolidated.

  1. Changes
    - Migrates any remaining 'cerrada' tasks to 'resuelta'
    - Updates the estado CHECK constraint to remove 'cerrada'
    - Updates the trigger to only handle 'resuelta' state for fecha_cierre
*/

UPDATE tareas SET estado = 'resuelta' WHERE estado = 'cerrada';

ALTER TABLE tareas DROP CONSTRAINT IF EXISTS tareas_estado_check;

ALTER TABLE tareas ADD CONSTRAINT tareas_estado_check
  CHECK (estado IN ('pendiente', 'resuelta', 'con bugs', 'en revisión'));

CREATE OR REPLACE FUNCTION set_fecha_cierre_on_estado_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'resuelta' AND (OLD.estado IS NULL OR OLD.estado <> 'resuelta') THEN
    NEW.fecha_cierre = now();
  ELSIF NEW.estado <> 'resuelta' AND OLD.estado = 'resuelta' THEN
    NEW.fecha_cierre = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
