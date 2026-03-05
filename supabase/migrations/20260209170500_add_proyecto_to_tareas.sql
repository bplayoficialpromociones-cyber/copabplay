/*
  # Add Proyecto Column to Tareas Table

  1. Changes
    - Add `proyecto` column to tareas table
    - Set allowed values: 'Copa bplay', 'La Lupa de Tobi'
    - Set default value to 'Copa bplay'
    - Make column NOT NULL

  2. Notes
    - Existing records will get the default value 'Copa bplay'
    - This is a simple enumeration stored directly in the table
*/

-- Add proyecto column with default value
ALTER TABLE tareas 
ADD COLUMN IF NOT EXISTS proyecto TEXT NOT NULL DEFAULT 'Copa bplay';

-- Add check constraint to ensure only valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tareas_proyecto_check'
  ) THEN
    ALTER TABLE tareas
    ADD CONSTRAINT tareas_proyecto_check 
    CHECK (proyecto IN ('Copa bplay', 'La Lupa de Tobi'));
  END IF;
END $$;