/*
  # Convert Tareas Files to Arrays

  1. Changes
    - Convert `imagen_tarea` from text to jsonb array to support multiple images
    - Convert `video_tarea` from text to jsonb array to support multiple videos

  2. Migration Strategy
    - Create new columns with _new suffix
    - Migrate existing data (single URLs to array format)
    - Drop old columns
    - Rename new columns to original names

  3. Notes
    - Existing single file URLs will be converted to arrays with one element
    - Null values will be converted to empty arrays
*/

-- Add new jsonb columns for arrays
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS imagen_tarea_new jsonb DEFAULT '[]'::jsonb;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS video_tarea_new jsonb DEFAULT '[]'::jsonb;

-- Migrate existing data: convert single URLs to arrays
DO $$
BEGIN
  -- Migrate images
  UPDATE tareas
  SET imagen_tarea_new =
    CASE
      WHEN imagen_tarea IS NOT NULL AND imagen_tarea != ''
      THEN jsonb_build_array(imagen_tarea)
      ELSE '[]'::jsonb
    END
  WHERE imagen_tarea_new = '[]'::jsonb;

  -- Migrate videos
  UPDATE tareas
  SET video_tarea_new =
    CASE
      WHEN video_tarea IS NOT NULL AND video_tarea != ''
      THEN jsonb_build_array(video_tarea)
      ELSE '[]'::jsonb
    END
  WHERE video_tarea_new = '[]'::jsonb;
END $$;

-- Drop old columns
ALTER TABLE tareas DROP COLUMN IF EXISTS imagen_tarea;
ALTER TABLE tareas DROP COLUMN IF EXISTS video_tarea;

-- Rename new columns to original names
ALTER TABLE tareas RENAME COLUMN imagen_tarea_new TO imagen_tarea;
ALTER TABLE tareas RENAME COLUMN video_tarea_new TO video_tarea;