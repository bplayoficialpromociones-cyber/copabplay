/*
  # Crear tabla para Historial de Rankings Mensuales

  1. Nueva Tabla
    - `ranking_snapshots`
      - `id` (uuid, primary key)
      - `snapshot_date` (timestamptz) - Fecha y hora cuando se guardó el ranking
      - `month_name` (text) - Nombre del mes (ej: "Diciembre")
      - `year` (integer) - Año (ej: 2025)
      - `ranking_data` (jsonb) - Datos completos del ranking en formato JSON
      - `total_players` (integer) - Número total de jugadores en ese snapshot
      - `created_at` (timestamptz) - Fecha de creación del registro

  2. Seguridad
    - Habilitar RLS en la tabla `ranking_snapshots`
    - Agregar política para permitir lectura a usuarios autenticados
    - Agregar política para permitir inserción a usuarios autenticados
    - Agregar política para permitir eliminación a usuarios autenticados

  3. Índices
    - Crear índice en `snapshot_date` para búsquedas rápidas
    - Crear índice en `year` y `month_name` para filtros

  4. Notas Importantes
    - Esta tabla almacena el historial completo de rankings mensuales
    - Cada snapshot guarda todos los jugadores y sus datos
    - Los datos se almacenan en formato JSONB para flexibilidad
    - Los administradores pueden ver, crear y eliminar snapshots
*/

-- Crear tabla para snapshots de rankings
CREATE TABLE IF NOT EXISTS ranking_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date timestamptz NOT NULL DEFAULT now(),
  month_name text NOT NULL,
  year integer NOT NULL,
  ranking_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_players integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_date ON ranking_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_year_month ON ranking_snapshots(year DESC, month_name);

-- Habilitar RLS
ALTER TABLE ranking_snapshots ENABLE ROW LEVEL SECURITY;

-- Política para lectura por usuarios autenticados
CREATE POLICY "Authenticated users can read ranking snapshots"
  ON ranking_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para inserción por usuarios autenticados
CREATE POLICY "Authenticated users can insert ranking snapshots"
  ON ranking_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para eliminación por usuarios autenticados
CREATE POLICY "Authenticated users can delete ranking snapshots"
  ON ranking_snapshots
  FOR DELETE
  TO authenticated
  USING (true);

-- Comentarios en la tabla
COMMENT ON TABLE ranking_snapshots IS 'Almacena snapshots históricos de rankings mensuales';
COMMENT ON COLUMN ranking_snapshots.snapshot_date IS 'Fecha y hora cuando se guardó el snapshot';
COMMENT ON COLUMN ranking_snapshots.month_name IS 'Nombre del mes del ranking';
COMMENT ON COLUMN ranking_snapshots.year IS 'Año del ranking';
COMMENT ON COLUMN ranking_snapshots.ranking_data IS 'Datos completos del ranking en formato JSON';
COMMENT ON COLUMN ranking_snapshots.total_players IS 'Número total de jugadores en el snapshot';