/*
  # Agregar campo creada_por a tabla tareas

  1. Cambios
    - Agregar columna `creada_por` (text) a la tabla `tareas`
      - Almacena el nombre del usuario que creó la tarea
      - Campo no nullable con valor por defecto 'Sistema'
      - Las tareas existentes se marcarán como creadas por 'Sistema'
  
  2. Propósito
    - Registrar quién creó cada tarea
    - Mostrar información de auditoría en la interfaz
    - Este campo no será modificable después de la creación
*/

-- Agregar columna creada_por a tareas
ALTER TABLE tareas 
ADD COLUMN IF NOT EXISTS creada_por text NOT NULL DEFAULT 'Sistema';

-- Crear índice para búsquedas por creador
CREATE INDEX IF NOT EXISTS idx_tareas_creada_por ON tareas(creada_por);