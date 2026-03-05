/*
  # Add prioridad (priority) to tareas

  ## Summary
  Adds a priority field to the tareas table with three levels: baja, media, alta.

  ## Changes
  - New column `prioridad` on `tareas` table with CHECK constraint allowing only 'baja', 'media', 'alta'
  - Default value is 'baja' so all existing tasks are automatically assigned low priority
  - All existing rows will have prioridad = 'baja' applied automatically via DEFAULT
*/

ALTER TABLE tareas
  ADD COLUMN IF NOT EXISTS prioridad text NOT NULL DEFAULT 'baja'
  CHECK (prioridad IN ('baja', 'media', 'alta'));

-- Ensure all existing rows that might have NULL are set to 'baja'
UPDATE tareas SET prioridad = 'baja' WHERE prioridad IS NULL;
