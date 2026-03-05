/*
  # Agregar Lucila a las restricciones de notificaciones

  1. Cambios
    - Eliminar la restricción existente de usuario en notificaciones
    - Crear nueva restricción que incluya a Lucila
  
  2. Seguridad
    - Mantener la validación de usuarios permitidos
    - Agregar Lucila a la lista de usuarios válidos
*/

-- Eliminar la restricción existente
ALTER TABLE notificaciones 
DROP CONSTRAINT IF EXISTS notificaciones_usuario_check;

-- Crear nueva restricción incluyendo a Lucila
ALTER TABLE notificaciones 
ADD CONSTRAINT notificaciones_usuario_check 
CHECK (usuario = ANY (ARRAY['Tobias', 'Max', 'Alexis', 'Maxi', 'Lucila']));
