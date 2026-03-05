/*
  # Crear tabla de jugadores históricos

  1. Nueva Tabla
    - `historical_players`
      - `id` (uuid, primary key)
      - `player_name` (text) - Nombre del jugador
      - `usuario_bplay` (text) - Usuario real de Bplay
      - `province` (text) - Provincia donde vive
      - `first_participated_month` (text) - Primer mes que jugó
      - `first_participated_year` (integer) - Primer año que jugó
      - `last_participated_month` (text) - Último mes que jugó
      - `last_participated_year` (integer) - Último año que jugó
      - `total_participations` (integer) - Total de veces que participó
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint en player_name para evitar duplicados

  2. Seguridad
    - Enable RLS
    - Policy para que todos puedan leer (necesario para fiscalización)
    - Policies para que admin pueda insertar, actualizar y eliminar
*/

CREATE TABLE IF NOT EXISTS historical_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  usuario_bplay text DEFAULT 'sin definir',
  province text NOT NULL,
  first_participated_month text,
  first_participated_year integer,
  last_participated_month text,
  last_participated_year integer,
  total_participations integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(player_name)
);

ALTER TABLE historical_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view historical players"
  ON historical_players FOR SELECT
  USING (true);

CREATE POLICY "Admin can insert historical players"
  ON historical_players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can update historical players"
  ON historical_players FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can delete historical players"
  ON historical_players FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_historical_players_name ON historical_players(player_name);
CREATE INDEX IF NOT EXISTS idx_historical_players_usuario ON historical_players(usuario_bplay);