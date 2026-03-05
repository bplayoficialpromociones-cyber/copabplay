/*
  # Eliminar tablas redundantes de usuarios

  1. Objetivo
    - Eliminar tabla usuarios (ahora consolidada en admin_credentials)
    - Eliminar tabla usuarios_emails (redundante)
    - Limpiar funciones relacionadas
  
  2. Acciones
    - DROP tabla usuarios
    - DROP tabla usuarios_emails
    - DROP funciones de encriptación específicas de usuarios
*/

-- Eliminar tabla usuarios_emails (ya no se necesita)
DROP TABLE IF EXISTS usuarios_emails CASCADE;

-- Eliminar funciones específicas de usuarios
DROP FUNCTION IF EXISTS verify_usuario_password(text, text) CASCADE;
DROP FUNCTION IF EXISTS encrypt_usuario_password() CASCADE;
DROP TRIGGER IF EXISTS encrypt_usuario_password_trigger ON usuarios CASCADE;

-- Eliminar tabla usuarios
DROP TABLE IF EXISTS usuarios CASCADE;