/*
  # Eliminar permisos obsoletos de taskusers

  1. Objetivo
    - Eliminar todos los permisos asociados a la sección 'taskusers'
    - Esta sección fue consolidada en 'users'
*/

-- Eliminar permisos de la sección taskusers
DELETE FROM admin_permissions WHERE seccion = 'taskusers';