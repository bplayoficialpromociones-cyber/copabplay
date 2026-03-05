/*
  # Add 'en revisión' state to tareas table

  1. Changes
    - Modify the CHECK constraint on the `estado` column to include 'en revisión'
    - This allows tasks to have a new status: 'en revisión' (under review)
  
  2. New States Available
    - pendiente
    - resuelta
    - con bugs
    - en revisión (NEW)
*/

-- Drop the existing CHECK constraint
ALTER TABLE tareas DROP CONSTRAINT IF EXISTS tareas_estado_check;

-- Add the new CHECK constraint with 'en revisión' included
ALTER TABLE tareas ADD CONSTRAINT tareas_estado_check 
  CHECK (estado IN ('pendiente', 'resuelta', 'con bugs', 'en revisión'));