/*
  # Add 'BullPower' to tareas proyecto check constraint

  The tareas_proyecto_check constraint was missing 'BullPower' as a valid value.
  This migration updates the constraint to include it.
*/

ALTER TABLE tareas DROP CONSTRAINT IF EXISTS tareas_proyecto_check;

ALTER TABLE tareas ADD CONSTRAINT tareas_proyecto_check
  CHECK (proyecto IN ('Copa bplay', 'La Lupa de Tobi', 'BullPower'));
