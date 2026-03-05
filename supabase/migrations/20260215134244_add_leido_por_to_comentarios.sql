/*
  # Add leido_por field to tarea_comentarios

  1. Changes
    - Add `leido_por` text[] column to track which users have read each comment
    - Default value is empty array

  2. Purpose
    - Allow users to mark comments as read/unread
    - Each user can independently track their read status
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tarea_comentarios' AND column_name = 'leido_por'
  ) THEN
    ALTER TABLE tarea_comentarios 
    ADD COLUMN leido_por text[] DEFAULT '{}';
  END IF;
END $$;
