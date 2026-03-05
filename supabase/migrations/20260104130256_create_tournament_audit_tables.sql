/*
  # Create tournament audit tables

  1. New Tables
    - `tournament_audit_files`
      - `id` (uuid, primary key)
      - `month` (text) - Mes del torneo
      - `year` (integer) - Año del torneo
      - `file_name` (text) - Nombre del archivo original
      - `file_url` (text) - URL del archivo almacenado
      - `file_size` (integer) - Tamaño del archivo en bytes
      - `total_records` (integer) - Total de registros procesados
      - `bplay_players_count` (integer) - Cantidad de jugadores que jugaron Copa Bplay
      - `uploaded_at` (timestamptz) - Fecha de carga
      - `processed` (boolean) - Si el archivo fue procesado
      - Unique constraint on (month, year)
    
    - `tournament_audit_data`
      - `id` (uuid, primary key)
      - `audit_file_id` (uuid, foreign key) - Referencia al archivo
      - `player_name` (text) - Nombre del jugador
      - `usuario_bplay` (text) - Usuario Bplay del jugador
      - `played_copa_bplay` (boolean) - Si jugó la Copa Bplay ese mes
      - `position` (integer) - Posición en el ranking del archivo
      - `points` (integer) - Puntos del jugador
      - `raw_data` (jsonb) - Todos los datos del registro en formato JSON
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (admin has its own authentication layer)

  3. Indexes
    - Add index on (audit_file_id) for faster queries
    - Add index on (played_copa_bplay) for filtering
    - Add composite index on (month, year) for uniqueness validation
*/

-- Create tournament_audit_files table
CREATE TABLE IF NOT EXISTS tournament_audit_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,
  year integer NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer DEFAULT 0,
  total_records integer DEFAULT 0,
  bplay_players_count integer DEFAULT 0,
  uploaded_at timestamptz DEFAULT now(),
  processed boolean DEFAULT false,
  UNIQUE(month, year)
);

-- Create tournament_audit_data table
CREATE TABLE IF NOT EXISTS tournament_audit_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_file_id uuid NOT NULL REFERENCES tournament_audit_files(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  usuario_bplay text DEFAULT 'sin definir',
  played_copa_bplay boolean DEFAULT false,
  position integer,
  points integer DEFAULT 0,
  raw_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_data_file_id ON tournament_audit_data(audit_file_id);
CREATE INDEX IF NOT EXISTS idx_audit_data_played_bplay ON tournament_audit_data(played_copa_bplay);
CREATE INDEX IF NOT EXISTS idx_audit_files_month_year ON tournament_audit_files(month, year);

-- Enable RLS
ALTER TABLE tournament_audit_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_audit_data ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (admin authentication is at application level)
CREATE POLICY "Allow public to read tournament audit files"
  ON tournament_audit_files
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to insert tournament audit files"
  ON tournament_audit_files
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public to update tournament audit files"
  ON tournament_audit_files
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete tournament audit files"
  ON tournament_audit_files
  FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public to read tournament audit data"
  ON tournament_audit_data
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to insert tournament audit data"
  ON tournament_audit_data
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public to update tournament audit data"
  ON tournament_audit_data
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete tournament audit data"
  ON tournament_audit_data
  FOR DELETE
  TO public
  USING (true);
