/*
  # Agregar campo leida_por a tabla tareas

  1. Cambios
    - Agregar columna `leida_por` (text[]) a la tabla `tareas`
      - Array de nombres de usuario que han marcado la tarea como leída
      - Por defecto es un array vacío
  
  2. Propósito
    - Permitir que los usuarios marquen tareas completas como leídas
    - Evitar que aparezcan alertas de tareas ya leídas por el usuario
*/

-- Agregar columna leida_por a tareas
ALTER TABLE tareas 
ADD COLUMN IF NOT EXISTS leida_por text[] DEFAULT '{}';

-- Crear índice para búsquedas más rápidas
CREATE INDEX IF NOT EXISTS idx_tareas_leida_por ON tareas USING GIN(leida_por);