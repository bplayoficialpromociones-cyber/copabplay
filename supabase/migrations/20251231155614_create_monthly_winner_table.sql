/*
  # Crear tabla para Ganador del Mes

  1. Nueva Tabla
    - `monthly_winner_content`
      - `id` (uuid, primary key)
      - `image_url` (text) - URL de la imagen del ganador del mes
      - `language` (text) - Idioma ('es', 'en', 'pt', 'fr', 'de', 'zh')
      - `updated_at` (timestamptz) - Última actualización
      - `created_at` (timestamptz) - Fecha de creación

  2. Seguridad
    - Habilitar RLS en la tabla `monthly_winner_content`
    - Agregar política para permitir lectura pública
    - Agregar política para permitir actualización solo a usuarios autenticados

  3. Notas Importantes
    - Cada idioma tiene su propia entrada en la tabla
    - La imagen se almacena como URL
    - Los usuarios públicos pueden ver el contenido
    - Solo usuarios autenticados pueden actualizar el contenido
*/

-- Crear tabla para contenido del ganador del mes
CREATE TABLE IF NOT EXISTS monthly_winner_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'es',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(language)
);

-- Habilitar RLS
ALTER TABLE monthly_winner_content ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública
CREATE POLICY "Anyone can read monthly winner content"
  ON monthly_winner_content
  FOR SELECT
  TO public
  USING (true);

-- Política para actualización por usuarios autenticados
CREATE POLICY "Authenticated users can update monthly winner content"
  ON monthly_winner_content
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para inserción por usuarios autenticados
CREATE POLICY "Authenticated users can insert monthly winner content"
  ON monthly_winner_content
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insertar valores por defecto para cada idioma
INSERT INTO monthly_winner_content (language, image_url)
VALUES 
  ('es', '/freepik__apaisar-la-imagen-img6-completar-con-lo-que-haga-f__79090.png'),
  ('en', '/freepik__apaisar-la-imagen-img6-completar-con-lo-que-haga-f__79090.png'),
  ('pt', '/freepik__apaisar-la-imagen-img6-completar-con-lo-que-haga-f__79090.png'),
  ('fr', '/freepik__apaisar-la-imagen-img6-completar-con-lo-que-haga-f__79090.png'),
  ('de', '/freepik__apaisar-la-imagen-img6-completar-con-lo-que-haga-f__79090.png'),
  ('zh', '/freepik__apaisar-la-imagen-img6-completar-con-lo-que-haga-f__79090.png')
ON CONFLICT (language) DO NOTHING;