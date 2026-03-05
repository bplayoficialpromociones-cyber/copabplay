/*
  # Motor de IA de Tendencias - Nuevos campos y tabla de logica

  ## Cambios en lupa_noticias
  - `importancia`: nivel calculado por el motor IA ('viral', 'importante', 'normal', 'descartada')
  - `score_ia`: puntaje numerico 0-100 que asigno la IA al evaluar la noticia
  - `razon_importancia`: explicacion en espanol de por que la IA clasifico asi la noticia
  - `es_tendencia`: booleano, true si el motor IA determino que es tendencia real

  ## Cambios en lupa_hilos
  - `importancia_hilo`: nivel del hilo calculado por suma de scores de sus noticias
  - `score_promedio`: promedio de score_ia de las noticias del hilo
  - `ultima_logica_version`: version del motor IA que proceso este hilo por ultima vez

  ## Nueva tabla lupa_logica_ia
  Registra cada version del motor de clasificacion, que cambio, y sus resultados.
  Permite ver la evolucion del motor y entender como mejora con cada importacion.
*/

-- Nuevos campos en lupa_noticias
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lupa_noticias' AND column_name='importancia') THEN
    ALTER TABLE lupa_noticias ADD COLUMN importancia text DEFAULT 'normal' CHECK (importancia IN ('viral','importante','normal','descartada'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lupa_noticias' AND column_name='score_ia') THEN
    ALTER TABLE lupa_noticias ADD COLUMN score_ia integer DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lupa_noticias' AND column_name='razon_importancia') THEN
    ALTER TABLE lupa_noticias ADD COLUMN razon_importancia text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lupa_noticias' AND column_name='es_tendencia') THEN
    ALTER TABLE lupa_noticias ADD COLUMN es_tendencia boolean DEFAULT false;
  END IF;
END $$;

-- Nuevos campos en lupa_hilos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lupa_hilos' AND column_name='importancia_hilo') THEN
    ALTER TABLE lupa_hilos ADD COLUMN importancia_hilo text DEFAULT 'normal' CHECK (importancia_hilo IN ('viral','importante','normal'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lupa_hilos' AND column_name='score_promedio') THEN
    ALTER TABLE lupa_hilos ADD COLUMN score_promedio integer DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lupa_hilos' AND column_name='ultima_logica_version') THEN
    ALTER TABLE lupa_hilos ADD COLUMN ultima_logica_version text DEFAULT '';
  END IF;
END $$;

-- Tabla de historial de logica IA
CREATE TABLE IF NOT EXISTS lupa_logica_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL DEFAULT '',
  fecha_activacion timestamptz DEFAULT now(),
  resumen_coloquial text DEFAULT '',
  cambios_vs_anterior text DEFAULT '',
  parametros jsonb DEFAULT '{}',
  stats_importacion jsonb DEFAULT '{}',
  total_analizadas integer DEFAULT 0,
  total_virales integer DEFAULT 0,
  total_importantes integer DEFAULT 0,
  total_descartadas integer DEFAULT 0,
  precision_estimada integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lupa_logica_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read logica ia"
  ON lupa_logica_ia FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert logica ia"
  ON lupa_logica_ia FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can update logica ia"
  ON lupa_logica_ia FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
