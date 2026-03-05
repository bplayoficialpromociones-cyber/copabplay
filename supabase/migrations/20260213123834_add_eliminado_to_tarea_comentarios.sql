/*
  # Agregar funcionalidad de eliminación suave para comentarios

  ## Cambios
  1. Nuevas Columnas
    - `eliminado` (boolean, default false): Indica si el comentario fue eliminado
    - `fecha_eliminacion` (timestamptz, nullable): Fecha en que se eliminó el comentario
    - `eliminado_por` (text, nullable): Usuario que eliminó el comentario
  
  2. Índices
    - Índice en columna `eliminado` para mejorar rendimiento de queries
  
  ## Notas Importantes
  - Los comentarios eliminados no se borran físicamente de la base de datos
  - Se usa "soft delete" para mantener historial
  - Solo usuarios admin pueden ver comentarios eliminados
  - Los comentarios eliminados no aparecen en la vista normal
*/

-- Agregar columnas para eliminación suave
DO $$
BEGIN
  -- Columna eliminado
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tarea_comentarios' AND column_name = 'eliminado'
  ) THEN
    ALTER TABLE tarea_comentarios ADD COLUMN eliminado boolean NOT NULL DEFAULT false;
  END IF;

  -- Columna fecha_eliminacion
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tarea_comentarios' AND column_name = 'fecha_eliminacion'
  ) THEN
    ALTER TABLE tarea_comentarios ADD COLUMN fecha_eliminacion timestamptz;
  END IF;

  -- Columna eliminado_por
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tarea_comentarios' AND column_name = 'eliminado_por'
  ) THEN
    ALTER TABLE tarea_comentarios ADD COLUMN eliminado_por text;
  END IF;
END $$;

-- Crear índice para mejorar rendimiento de queries
CREATE INDEX IF NOT EXISTS idx_tarea_comentarios_eliminado ON tarea_comentarios(eliminado);

-- Crear índice compuesto para queries comunes
CREATE INDEX IF NOT EXISTS idx_tarea_comentarios_tarea_eliminado ON tarea_comentarios(tarea_id, eliminado);