/*
  # Tabla de progreso del job de La Lupa

  Permite al frontend consultar el progreso en tiempo real via polling.
  El job escribe su estado aqui durante la ejecucion.

  - `lupa_job_progress`
    - id: siempre 'current' (upsert)
    - estado: 'idle' | 'running' | 'done' | 'error'
    - fuente_actual: nombre de la fuente que se esta procesando
    - fuentes_total: total de fuentes a procesar
    - fuentes_procesadas: cuantas fuentes se procesaron
    - noticias_insertadas: nuevas noticias agregadas
    - noticias_duplicadas: duplicados descartados
    - ultima_noticia: titulo de la ultima noticia insertada
    - porcentaje: 0-100
    - mensaje: texto libre de estado
    - started_at: cuando empezo
    - updated_at: ultima actualizacion
*/

CREATE TABLE IF NOT EXISTS lupa_job_progress (
  id text PRIMARY KEY DEFAULT 'current',
  estado text NOT NULL DEFAULT 'idle',
  fuente_actual text DEFAULT '',
  fuentes_total integer DEFAULT 0,
  fuentes_procesadas integer DEFAULT 0,
  noticias_insertadas integer DEFAULT 0,
  noticias_duplicadas integer DEFAULT 0,
  ultima_noticia text DEFAULT '',
  porcentaje integer DEFAULT 0,
  mensaje text DEFAULT '',
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lupa_job_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read lupa_job_progress"
  ON lupa_job_progress FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert lupa_job_progress"
  ON lupa_job_progress FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update lupa_job_progress"
  ON lupa_job_progress FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

INSERT INTO lupa_job_progress (id, estado, mensaje)
VALUES ('current', 'idle', 'Sin ejecutar todavia')
ON CONFLICT (id) DO NOTHING;
