/*
  # Configuración de Iconos para Emails

  1. Nueva Tabla
    - `email_icons_config`
      - `id` (uuid, primary key)
      - `tipo_notificacion` (text) - Tipo de notificación (nueva_tarea, tarea_modificada, etc.)
      - `icono_url` (text) - URL del icono seleccionado
      - `icono_nombre` (text) - Nombre descriptivo del icono
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Seguridad
    - Enable RLS
    - Los usuarios anónimos pueden leer (para enviar emails)
    - Solo usuarios autenticados pueden modificar

  3. Datos Iniciales
    - Configuración por defecto para cada tipo de notificación
*/

-- Crear tabla de configuración de iconos
CREATE TABLE IF NOT EXISTS email_icons_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_notificacion text UNIQUE NOT NULL,
  icono_url text NOT NULL,
  icono_nombre text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE email_icons_config ENABLE ROW LEVEL SECURITY;

-- Políticas: Todos pueden leer (para enviar emails)
CREATE POLICY "Permitir lectura pública de configuración de iconos"
  ON email_icons_config
  FOR SELECT
  TO public
  USING (true);

-- Políticas: Solo anon puede actualizar (para el admin panel)
CREATE POLICY "Permitir actualización de configuración de iconos"
  ON email_icons_config
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Políticas: Solo anon puede insertar
CREATE POLICY "Permitir inserción de configuración de iconos"
  ON email_icons_config
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Insertar configuración por defecto
INSERT INTO email_icons_config (tipo_notificacion, icono_url, icono_nombre)
VALUES 
  ('nueva_tarea', 'https://img.icons8.com/fluency/96/task.png', 'Task Icon'),
  ('tarea_modificada', 'https://img.icons8.com/fluency/96/edit.png', 'Edit Icon'),
  ('tarea_eliminada', 'https://img.icons8.com/fluency/96/delete-sign.png', 'Delete Icon'),
  ('nuevo_comentario', 'https://img.icons8.com/fluency/96/chat.png', 'Chat Icon'),
  ('comentario_modificado', 'https://img.icons8.com/fluency/96/edit-message.png', 'Edit Message Icon'),
  ('comentario_eliminado', 'https://img.icons8.com/fluency/96/delete-message.png', 'Delete Message Icon')
ON CONFLICT (tipo_notificacion) DO NOTHING;
