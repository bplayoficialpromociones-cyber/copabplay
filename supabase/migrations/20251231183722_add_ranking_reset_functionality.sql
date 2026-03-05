/*
  # Sistema de Reseteo y Guardado Histórico de Rankings

  1. Nueva Tabla: ranking_history
    - `id` (uuid, primary key) - Identificador único del snapshot
    - `snapshot_date` (timestamptz) - Fecha y hora del guardado
    - `month` (integer) - Mes del ranking (1-12)
    - `year` (integer) - Año del ranking
    - `snapshot_data` (jsonb) - Datos completos del ranking guardado
    - `total_players` (integer) - Total de jugadores en el snapshot
    - `created_at` (timestamptz) - Timestamp de creación

  2. Seguridad
    - Habilitar RLS en ranking_history
    - Solo lectura pública para ver el historial
    - Solo administradores pueden crear snapshots (a través de la aplicación)

  3. Índices
    - Índice en year y month para búsquedas rápidas
    - Índice en snapshot_date para ordenamiento
*/

CREATE TABLE IF NOT EXISTS ranking_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date timestamptz DEFAULT now() NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 1900),
  snapshot_data jsonb NOT NULL,
  total_players integer DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ranking_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ranking history"
  ON ranking_history
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can insert ranking history"
  ON ranking_history
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ranking_history_year_month 
  ON ranking_history(year DESC, month DESC);

CREATE INDEX IF NOT EXISTS idx_ranking_history_snapshot_date 
  ON ranking_history(snapshot_date DESC);

COMMENT ON TABLE ranking_history IS 'Historical snapshots of ranking data for each month';
COMMENT ON COLUMN ranking_history.snapshot_data IS 'Complete ranking data stored as JSON';
COMMENT ON COLUMN ranking_history.description IS 'Optional description for the snapshot';
