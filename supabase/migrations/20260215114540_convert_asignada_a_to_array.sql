/*
  # Convert asignada_a to array for multiple assignees

  1. Changes
    - Convert `asignada_a` from text to jsonb array to support multiple assignees
    - Migrate existing single assignee data to array format

  2. Migration Strategy
    - Create new column with _new suffix
    - Migrate existing data (single user to array format)
    - Drop old column
    - Rename new column to original name

  3. Notes
    - Existing single assignee will be converted to arrays with one element
    - CHECK constraint will be updated to handle arrays
*/

-- Add new jsonb column for multiple assignees
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS asignada_a_new jsonb DEFAULT '[]'::jsonb;

-- Migrate existing data: convert single assignee to array
DO $$
BEGIN
  UPDATE tareas
  SET asignada_a_new = jsonb_build_array(asignada_a)
  WHERE asignada_a_new = '[]'::jsonb;
END $$;

-- Drop old column and its constraint
ALTER TABLE tareas DROP CONSTRAINT IF EXISTS tareas_asignada_a_check;
ALTER TABLE tareas DROP COLUMN IF EXISTS asignada_a;

-- Rename new column to original name
ALTER TABLE tareas RENAME COLUMN asignada_a_new TO asignada_a;

-- Add constraint to ensure at least one assignee
ALTER TABLE tareas ADD CONSTRAINT tareas_asignada_a_not_empty 
  CHECK (jsonb_array_length(asignada_a) > 0);