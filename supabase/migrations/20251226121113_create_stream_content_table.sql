/*
  # Create Stream Content Table

  1. New Tables
    - `stream_content`
      - `id` (uuid, primary key) - Unique identifier
      - `stream_date` (date) - Date of the stream
      - `stream_time` (time) - Time when something important happened
      - `platform` (text) - Streaming platform (Twitch, Kick, Youtube)
      - `description` (text) - What happened in the stream (max 500 chars)
      - `status` (text) - Publication status (Publicado, Pendiente de Publicar, No Publicado)
      - `share_platforms` (text[]) - Social media platforms to share (Instagram, Youtube, Facebook, Tik Tok)
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on stream_content table
    - Add policy for authenticated users to read all content
    - Add policy for authenticated users to insert/update/delete content

  3. Indexes
    - Create index on stream_date for faster date-based queries
    - Create index on status for filtering

  ## Important Notes
  - This table stores information about important stream moments
  - Only authenticated admin users can manage this content
  - The description field has a 500 character limit enforced by CHECK constraint
*/

-- Create stream_content table
CREATE TABLE IF NOT EXISTS stream_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_date date NOT NULL,
  stream_time time NOT NULL,
  platform text NOT NULL CHECK (platform IN ('Twitch', 'Kick', 'Youtube')),
  description text NOT NULL CHECK (char_length(description) <= 500),
  status text NOT NULL DEFAULT 'Pendiente de Publicar' CHECK (status IN ('Publicado', 'Pendiente de Publicar', 'No Publicado')),
  share_platforms text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stream_content_date ON stream_content(stream_date DESC);
CREATE INDEX IF NOT EXISTS idx_stream_content_status ON stream_content(status);

-- Enable RLS
ALTER TABLE stream_content ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (admins)
CREATE POLICY "Authenticated users can read stream content"
  ON stream_content FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stream content"
  ON stream_content FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stream content"
  ON stream_content FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stream content"
  ON stream_content FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stream_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stream_content_updated_at_trigger
  BEFORE UPDATE ON stream_content
  FOR EACH ROW
  EXECUTE FUNCTION update_stream_content_updated_at();