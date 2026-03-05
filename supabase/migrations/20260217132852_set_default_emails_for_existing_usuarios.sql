/*
  # Establecer emails por defecto para usuarios existentes

  1. Objetivo
    - Asignar emails temporales a usuarios que no tienen email configurado
    - Esto permite que el sistema funcione correctamente con los usuarios existentes
    - Los administradores deberán actualizar estos emails con los reales
  
  2. Acción
    - Actualizar usuarios sin email con un email temporal basado en su nombre
*/

-- Actualizar usuarios existentes que no tienen email
UPDATE usuarios 
SET email = LOWER(nombre) || '@temp.copabplay.com.ar'
WHERE email IS NULL OR email = '';

-- Actualizar usuarios existentes que no tienen clave con una clave temporal
-- La clave temporal será el nombre del usuario (deberán cambiarla)
UPDATE usuarios 
SET clave = nombre
WHERE clave IS NULL OR clave = '';