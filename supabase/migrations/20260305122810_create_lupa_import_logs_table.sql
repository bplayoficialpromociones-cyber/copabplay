/*
  # Crear tabla de logs de importacion RSS

  1. Nueva tabla: lupa_import_logs
    - id (uuid, pk)
    - ejecutado_en (timestamptz): fecha y hora de la ejecucion
    - tipo (text): 'manual' o 'automatico'
    - fuentes_procesadas (int): cantidad de fuentes procesadas
    - noticias_insertadas (int): cantidad de noticias nuevas guardadas
    - noticias_duplicadas (int): cantidad de noticias ya existentes
    - noticias_descartadas (int): cantidad descartadas por la IA
    - virales (int): cantidad clasificadas como virales
    - importantes (int): cantidad clasificadas como importantes
    - normales (int): cantidad clasificadas como normales
    - version_logica (text): version del motor IA usado
    - duracion_segundos (int): tiempo de ejecucion en segundos
    - estado (text): 'exitoso', 'error', 'sin_noticias'
    - error_mensaje (text): mensaje de error si lo hubo
    - created_at (timestamptz)

  2. Seguridad: RLS habilitado con politicas para acceso anonimo
*/

CREATE TABLE IF NOT EXISTS lupa_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ejecutado_en timestamptz NOT NULL DEFAULT now(),
  tipo text NOT NULL DEFAULT 'automatico',
  fuentes_procesadas integer NOT NULL DEFAULT 0,
  noticias_insertadas integer NOT NULL DEFAULT 0,
  noticias_duplicadas integer NOT NULL DEFAULT 0,
  noticias_descartadas integer NOT NULL DEFAULT 0,
  virales integer NOT NULL DEFAULT 0,
  importantes integer NOT NULL DEFAULT 0,
  normales integer NOT NULL DEFAULT 0,
  version_logica text NOT NULL DEFAULT '',
  duracion_segundos integer NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'exitoso' CHECK (estado IN ('exitoso', 'error', 'sin_noticias')),
  error_mensaje text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lupa_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso publico lectura logs"
  ON lupa_import_logs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Acceso publico insercion logs"
  ON lupa_import_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
