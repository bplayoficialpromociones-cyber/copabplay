/*
  # Crear sistema "La Lupa de Tobi" - Tablas de noticias

  1. Nuevas Tablas
    - `lupa_noticias`
      - `id` (uuid, primary key)
      - `titulo` (text) - Titulo de la noticia
      - `descripcion` (text) - Resumen/descripcion
      - `descripcion_es` (text) - Traduccion al espanol si el original es ingles
      - `url` (text, unique) - URL original para deduplicacion
      - `url_hash` (text) - Hash de la URL para busqueda rapida
      - `fuente` (text) - Nombre de la fuente (ESPN, Ole, etc.)
      - `fuente_url` (text) - URL de la fuente RSS
      - `categoria` (text) - Categoria principal
      - `idioma` (text) - 'es' o 'en'
      - `imagen_url` (text) - Imagen de la noticia si existe
      - `fecha_publicacion` (timestamptz) - Fecha original de publicacion
      - `fecha_ingreso` (timestamptz) - Cuando la registramos
      - `leida` (boolean) - Si fue marcada como leida en el panel
      - `hilo_id` (uuid) - FK a lupa_hilos si pertenece a un hilo
      - `palabras_clave` (text[]) - Keywords detectadas para agrupacion
      - `enviado_telegram` (boolean) - Si ya se envio notificacion a Telegram
      - `tipo_fuente` (text) - 'rss' o 'twitter'

    - `lupa_hilos`
      - `id` (uuid, primary key)
      - `titulo` (text) - Titulo del hilo generado automaticamente
      - `categoria` (text) - Categoria principal del hilo
      - `palabras_clave` (text[]) - Keywords que agrupan las noticias
      - `cantidad_noticias` (integer) - Contador de noticias en el hilo
      - `primera_noticia_fecha` (timestamptz)
      - `ultima_noticia_fecha` (timestamptz)
      - `created_at` (timestamptz)

    - `lupa_fuentes`
      - `id` (uuid, primary key)
      - `nombre` (text) - Nombre descriptivo
      - `url` (text) - URL del RSS feed
      - `categoria` (text) - Categoria asignada
      - `activa` (boolean) - Si esta habilitada
      - `tipo` (text) - 'rss' o 'twitter'
      - `ultimo_fetch` (timestamptz)
      - `idioma` (text)

  2. Security
    - RLS habilitado en todas las tablas
    - Acceso anonimo de lectura (para el panel admin que usa anon key)
    - Acceso anonimo de escritura (para Edge Functions)
*/

-- Tabla de hilos (debe crearse antes por FK)
CREATE TABLE IF NOT EXISTS lupa_hilos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT 'general',
  palabras_clave text[] DEFAULT '{}',
  cantidad_noticias integer DEFAULT 1,
  primera_noticia_fecha timestamptz DEFAULT now(),
  ultima_noticia_fecha timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lupa_hilos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read lupa_hilos"
  ON lupa_hilos FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert lupa_hilos"
  ON lupa_hilos FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update lupa_hilos"
  ON lupa_hilos FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Tabla principal de noticias
CREATE TABLE IF NOT EXISTS lupa_noticias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL DEFAULT '',
  descripcion text DEFAULT '',
  descripcion_es text DEFAULT '',
  url text UNIQUE NOT NULL,
  url_hash text NOT NULL DEFAULT '',
  fuente text NOT NULL DEFAULT '',
  fuente_url text DEFAULT '',
  categoria text NOT NULL DEFAULT 'general',
  idioma text NOT NULL DEFAULT 'es',
  imagen_url text DEFAULT '',
  fecha_publicacion timestamptz DEFAULT now(),
  fecha_ingreso timestamptz DEFAULT now(),
  leida boolean DEFAULT false,
  hilo_id uuid REFERENCES lupa_hilos(id) ON DELETE SET NULL,
  palabras_clave text[] DEFAULT '{}',
  enviado_telegram boolean DEFAULT false,
  tipo_fuente text DEFAULT 'rss',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lupa_noticias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read lupa_noticias"
  ON lupa_noticias FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert lupa_noticias"
  ON lupa_noticias FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update lupa_noticias"
  ON lupa_noticias FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete lupa_noticias"
  ON lupa_noticias FOR DELETE
  TO anon
  USING (true);

-- Tabla de fuentes RSS configurables
CREATE TABLE IF NOT EXISTS lupa_fuentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT 'general',
  activa boolean DEFAULT true,
  tipo text DEFAULT 'rss',
  ultimo_fetch timestamptz,
  idioma text DEFAULT 'es',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lupa_fuentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read lupa_fuentes"
  ON lupa_fuentes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert lupa_fuentes"
  ON lupa_fuentes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update lupa_fuentes"
  ON lupa_fuentes FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete lupa_fuentes"
  ON lupa_fuentes FOR DELETE
  TO anon
  USING (true);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_lupa_noticias_fecha ON lupa_noticias(fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_lupa_noticias_categoria ON lupa_noticias(categoria);
CREATE INDEX IF NOT EXISTS idx_lupa_noticias_hilo ON lupa_noticias(hilo_id);
CREATE INDEX IF NOT EXISTS idx_lupa_noticias_url_hash ON lupa_noticias(url_hash);
CREATE INDEX IF NOT EXISTS idx_lupa_noticias_leida ON lupa_noticias(leida);
CREATE INDEX IF NOT EXISTS idx_lupa_noticias_enviado ON lupa_noticias(enviado_telegram);

-- Insertar fuentes RSS iniciales
INSERT INTO lupa_fuentes (nombre, url, categoria, idioma, tipo) VALUES
  -- Google News - Inter Miami
  ('Google News - Inter Miami EN', 'https://news.google.com/rss/search?q=Inter+Miami+CF&hl=en-US&gl=US&ceid=US:en', 'inter-miami', 'en', 'rss'),
  ('Google News - Inter Miami ES', 'https://news.google.com/rss/search?q=Inter+Miami+CF&hl=es-419&gl=AR&ceid=AR:es-419', 'inter-miami', 'es', 'rss'),
  -- Google News - Messi
  ('Google News - Messi EN', 'https://news.google.com/rss/search?q=Lionel+Messi&hl=en-US&gl=US&ceid=US:en', 'messi', 'en', 'rss'),
  ('Google News - Messi ES', 'https://news.google.com/rss/search?q=Leo+Messi&hl=es-419&gl=AR&ceid=AR:es-419', 'messi', 'es', 'rss'),
  -- Google News - Seleccion Argentina
  ('Google News - Seleccion Argentina', 'https://news.google.com/rss/search?q=Seleccion+Argentina+futbol&hl=es-419&gl=AR&ceid=AR:es-419', 'seleccion-argentina', 'es', 'rss'),
  ('Google News - Argentina NT EN', 'https://news.google.com/rss/search?q=Argentina+national+football+team&hl=en-US&gl=US&ceid=US:en', 'seleccion-argentina', 'en', 'rss'),
  -- Google News - Copa del Mundo 2026
  ('Google News - World Cup 2026 EN', 'https://news.google.com/rss/search?q=FIFA+World+Cup+2026&hl=en-US&gl=US&ceid=US:en', 'copa-mundial-2026', 'en', 'rss'),
  ('Google News - Copa del Mundo 2026', 'https://news.google.com/rss/search?q=Copa+del+Mundo+2026+FIFA&hl=es-419&gl=AR&ceid=AR:es-419', 'copa-mundial-2026', 'es', 'rss'),
  -- Google News - Jugadores Argentina
  ('Google News - De Paul', 'https://news.google.com/rss/search?q=Rodrigo+De+Paul+Argentina&hl=es-419&gl=AR&ceid=AR:es-419', 'seleccion-argentina', 'es', 'rss'),
  ('Google News - Mac Allister', 'https://news.google.com/rss/search?q=Alexis+Mac+Allister&hl=es-419&gl=AR&ceid=AR:es-419', 'seleccion-argentina', 'es', 'rss'),
  ('Google News - Julian Alvarez', 'https://news.google.com/rss/search?q=Julian+Alvarez+Argentina&hl=es-419&gl=AR&ceid=AR:es-419', 'seleccion-argentina', 'es', 'rss'),
  ('Google News - Lautaro Martinez', 'https://news.google.com/rss/search?q=Lautaro+Martinez+Argentina&hl=es-419&gl=AR&ceid=AR:es-419', 'seleccion-argentina', 'es', 'rss'),
  -- Ole.com.ar RSS
  ('Ole - Seleccion Argentina', 'https://www.ole.com.ar/rss/seleccion-argentina/', 'seleccion-argentina', 'es', 'rss'),
  ('Ole - Deportes General', 'https://www.ole.com.ar/rss/futbol-internacional/', 'inter-miami', 'es', 'rss'),
  -- TyC Sports RSS
  ('TyC Sports - Seleccion', 'https://www.tycsports.com/rss/seleccion-argentina.xml', 'seleccion-argentina', 'es', 'rss'),
  -- Infobae Deportes
  ('Infobae - Deportes', 'https://www.infobae.com/feeds/rss/deportes/', 'seleccion-argentina', 'es', 'rss'),
  -- ESPN Argentina
  ('ESPN Argentina RSS', 'https://espndeportes.espn.com/rss/news?sections=soccer', 'seleccion-argentina', 'es', 'rss'),
  -- YouTube Inter Miami (RSS nativo)
  ('YouTube - Inter Miami CF', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCkMoUGM-oMEXlPnBIgHjTjg', 'inter-miami', 'en', 'rss'),
  -- Google News - Jugadores Inter Miami
  ('Google News - Luis Suarez Miami', 'https://news.google.com/rss/search?q=Luis+Suarez+Inter+Miami&hl=es-419&gl=AR&ceid=AR:es-419', 'inter-miami', 'es', 'rss'),
  ('Google News - Jordi Alba Miami', 'https://news.google.com/rss/search?q=Jordi+Alba+Inter+Miami&hl=es-419&gl=AR&ceid=AR:es-419', 'inter-miami', 'es', 'rss'),
  ('Google News - Busquets Miami', 'https://news.google.com/rss/search?q=Busquets+Inter+Miami&hl=es-419&gl=AR&ceid=AR:es-419', 'inter-miami', 'es', 'rss'),
  ('Google News - Enzo Fernandez', 'https://news.google.com/rss/search?q=Enzo+Fernandez+Argentina&hl=es-419&gl=AR&ceid=AR:es-419', 'seleccion-argentina', 'es', 'rss')
ON CONFLICT DO NOTHING;
