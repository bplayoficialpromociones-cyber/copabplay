/*
  # Add 'cerrada' state and auto fecha_cierre logic

  1. Changes
    - Adds 'cerrada' to the estado CHECK constraint on tareas table
    - Creates a trigger that automatically sets fecha_cierre = now() when estado changes to 'cerrada'
    - Creates a trigger that clears fecha_cierre if estado changes away from 'cerrada'

  2. New States Available
    - pendiente
    - resuelta
    - con bugs
    - en revisión
    - cerrada (NEW)

  3. Trigger Logic
    - On UPDATE: if new.estado = 'cerrada' and old.estado != 'cerrada' → set fecha_cierre = now()
    - On UPDATE: if new.estado != 'cerrada' and old.estado = 'cerrada' → set fecha_cierre = null
*/

-- Drop and recreate the CHECK constraint to include 'cerrada'
ALTER TABLE tareas DROP CONSTRAINT IF EXISTS tareas_estado_check;

ALTER TABLE tareas ADD CONSTRAINT tareas_estado_check
  CHECK (estado IN ('pendiente', 'resuelta', 'con bugs', 'en revisión', 'cerrada'));

-- Create the trigger function
CREATE OR REPLACE FUNCTION set_fecha_cierre_on_estado_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'cerrada' AND (OLD.estado IS NULL OR OLD.estado <> 'cerrada') THEN
    NEW.fecha_cierre = now();
  ELSIF NEW.estado <> 'cerrada' AND OLD.estado = 'cerrada' THEN
    NEW.fecha_cierre = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to allow re-running migration safely
DROP TRIGGER IF EXISTS trg_set_fecha_cierre ON tareas;

-- Create the trigger
CREATE TRIGGER trg_set_fecha_cierre
  BEFORE UPDATE ON tareas
  FOR EACH ROW
  EXECUTE FUNCTION set_fecha_cierre_on_estado_change();
