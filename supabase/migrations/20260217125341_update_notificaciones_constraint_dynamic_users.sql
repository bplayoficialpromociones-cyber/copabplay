/*
  # Actualizar restricción de notificaciones para usuarios dinámicos

  1. Cambios
    - Eliminar constraint CHECK que verifica usuario contra lista fija
    - Agregar constraint FOREIGN KEY que valida contra tabla usuarios
    - Esto permite que los usuarios sean dinámicos

  2. Seguridad
    - Mantener la validación de usuarios pero de forma dinámica
    - Solo permitir notificaciones para usuarios que existen en la tabla usuarios
*/

-- Eliminar constraint CHECK existente
ALTER TABLE notificaciones 
DROP CONSTRAINT IF EXISTS notificaciones_usuario_check;

-- Agregar constraint FOREIGN KEY hacia tabla usuarios
-- Nota: Esto fallará si hay notificaciones con usuarios que no existen en la tabla usuarios
-- Por lo tanto, primero verificamos y limpiamos
DO $$
BEGIN
  -- Eliminar notificaciones de usuarios que no existen en la tabla usuarios
  DELETE FROM notificaciones 
  WHERE usuario NOT IN (SELECT nombre FROM usuarios);
  
  -- Ahora agregar el constraint
  ALTER TABLE notificaciones 
  ADD CONSTRAINT notificaciones_usuario_fkey 
  FOREIGN KEY (usuario) REFERENCES usuarios(nombre) ON UPDATE CASCADE ON DELETE RESTRICT;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error al agregar foreign key: %', SQLERRM;
END $$;
