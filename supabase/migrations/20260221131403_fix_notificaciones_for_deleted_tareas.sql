/*
  # Fix notificaciones para tareas eliminadas

  1. Cambios
    - Remover `ON DELETE CASCADE` de tarea_id para permitir notificaciones de tareas eliminadas
    - Hacer tarea_id nullable para permitir notificaciones sin tarea asociada
    - Agregar 'tarea_eliminada' y 'comentario_eliminado' a los tipos permitidos

  2. Seguridad
    - Mantener todas las políticas RLS existentes
*/

-- PASO 1: Remover el constraint de foreign key existente con CASCADE
ALTER TABLE notificaciones
DROP CONSTRAINT IF EXISTS notificaciones_tarea_id_fkey;

-- PASO 2: Hacer tarea_id nullable (permitir null para notificaciones de tareas eliminadas)
ALTER TABLE notificaciones
ALTER COLUMN tarea_id DROP NOT NULL;

-- PASO 3: Agregar nuevo constraint sin CASCADE (SET NULL cuando se elimina la tarea)
ALTER TABLE notificaciones
ADD CONSTRAINT notificaciones_tarea_id_fkey
FOREIGN KEY (tarea_id)
REFERENCES tareas(id)
ON DELETE SET NULL;

-- PASO 4: Actualizar el constraint de tipo para incluir tarea_eliminada y comentario_eliminado
ALTER TABLE notificaciones
DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;

ALTER TABLE notificaciones
ADD CONSTRAINT notificaciones_tipo_check
CHECK (tipo IN (
  'nueva_tarea',
  'nuevo_comentario',
  'tarea_modificada',
  'tarea_eliminada',
  'comentario_eliminado'
));
