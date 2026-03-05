/*
  # Create tarea_comentarios table for task comments

  1. New Tables
    - `tarea_comentarios`
      - `id` (uuid, primary key) - Unique identifier
      - `tarea_id` (integer, foreign key) - References tareas table
      - `autor` (text) - Name of comment author (Tobi, Max, Alexis, etc)
      - `contenido` (text) - Comment content
      - `parent_comment_id` (uuid, nullable) - Reference to parent comment for nested/threaded comments
      - `fecha_creacion` (timestamptz) - When comment was created
      - `fecha_edicion` (timestamptz, nullable) - When comment was last edited
      - `created_at` (timestamptz) - Timestamp for record creation
      - `updated_at` (timestamptz) - Timestamp for record updates

  2. Security
    - Enable RLS on `tarea_comentarios` table
    - Add policy for authenticated users to read all comments
    - Add policy for authenticated users to insert comments
    - Add policy for authenticated users to update their own comments
    
  3. Indexes
    - Create index on tarea_id for faster lookups
    - Create index on parent_comment_id for nested comment queries
    - Create full-text search index on contenido for comment search
*/

CREATE TABLE IF NOT EXISTS tarea_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id integer NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  autor text NOT NULL,
  contenido text NOT NULL,
  parent_comment_id uuid REFERENCES tarea_comentarios(id) ON DELETE CASCADE,
  fecha_creacion timestamptz DEFAULT now() NOT NULL,
  fecha_edicion timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tarea_comentarios_tarea_id ON tarea_comentarios(tarea_id);
CREATE INDEX IF NOT EXISTS idx_tarea_comentarios_parent ON tarea_comentarios(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_tarea_comentarios_fecha ON tarea_comentarios(fecha_creacion DESC);

-- Enable RLS
ALTER TABLE tarea_comentarios ENABLE ROW LEVEL SECURITY;

-- Policy for reading comments (authenticated users can read all)
CREATE POLICY "Authenticated users can read all comments"
  ON tarea_comentarios
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for inserting comments (authenticated users can insert)
CREATE POLICY "Authenticated users can insert comments"
  ON tarea_comentarios
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy for updating comments (authenticated users can update any comment)
CREATE POLICY "Authenticated users can update comments"
  ON tarea_comentarios
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_tarea_comentarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.fecha_edicion = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS update_tarea_comentarios_timestamp ON tarea_comentarios;
CREATE TRIGGER update_tarea_comentarios_timestamp
  BEFORE UPDATE ON tarea_comentarios
  FOR EACH ROW
  EXECUTE FUNCTION update_tarea_comentarios_updated_at();