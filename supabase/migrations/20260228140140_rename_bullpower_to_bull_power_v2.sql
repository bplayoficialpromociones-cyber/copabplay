/*
  # Rename BullPower to Bull Power

  1. Changes
    - Drops old check constraint on proyecto column
    - Updates all existing tareas rows with proyecto = 'BullPower' to 'Bull Power'
    - Recreates check constraint with the corrected name 'Bull Power'
*/

ALTER TABLE tareas DROP CONSTRAINT IF EXISTS tareas_proyecto_check;

UPDATE tareas SET proyecto = 'Bull Power' WHERE proyecto = 'BullPower';

ALTER TABLE tareas ADD CONSTRAINT tareas_proyecto_check
  CHECK (proyecto IN ('Copa bplay', 'La Lupa de Tobi', 'Bull Power'));
