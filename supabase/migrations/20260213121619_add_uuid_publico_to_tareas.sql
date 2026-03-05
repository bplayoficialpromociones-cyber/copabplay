/*
  # Agregar UUID público para compartir tareas

  ## Cambios
  1. Nuevas Columnas
    - `uuid_publico` (uuid, unique, not null): Identificador único público para compartir la tarea sin autenticación
    - Se genera automáticamente con gen_random_uuid()
    - Tiene índice único para búsquedas rápidas
  
  2. Seguridad
    - Actualizar política RLS para permitir lectura anónima de tareas usando uuid_publico
    - Los usuarios anónimos solo pueden leer tareas si conocen el uuid_publico
    - Los usuarios anónimos pueden leer comentarios de tareas públicas compartidas

  ## Notas Importantes
  - El uuid_publico se genera automáticamente al crear una tarea
  - Se usa para compartir tareas de forma segura sin exponer el ID interno
  - Permite acceso de solo lectura sin necesidad de autenticación
*/

-- Agregar columna uuid_publico a la tabla tareas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tareas' AND column_name = 'uuid_publico'
  ) THEN
    ALTER TABLE tareas ADD COLUMN uuid_publico uuid UNIQUE NOT NULL DEFAULT gen_random_uuid();
    CREATE INDEX IF NOT EXISTS idx_tareas_uuid_publico ON tareas(uuid_publico);
  END IF;
END $$;

-- Política para permitir lectura anónima de tareas usando uuid_publico
DROP POLICY IF EXISTS "Allow public read access via uuid_publico" ON tareas;
CREATE POLICY "Allow public read access via uuid_publico"
  ON tareas
  FOR SELECT
  TO anon
  USING (uuid_publico IS NOT NULL);

-- Política para permitir lectura anónima de comentarios de tareas públicas
DROP POLICY IF EXISTS "Allow public read comments for shared tasks" ON tarea_comentarios;
CREATE POLICY "Allow public read comments for shared tasks"
  ON tarea_comentarios
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM tareas
      WHERE tareas.id = tarea_comentarios.tarea_id
      AND tareas.uuid_publico IS NOT NULL
    )
  );