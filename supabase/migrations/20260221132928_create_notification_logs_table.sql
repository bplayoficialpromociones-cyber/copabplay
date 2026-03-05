/*
  # Tabla de auditoría para notificaciones

  1. Nueva Tabla: notification_logs
    - Registra TODOS los intentos de crear notificaciones
    - Permite debug de por qué no llegan las notificaciones
    - Captura errores y datos del intento

  2. Campos:
    - id: identificador único
    - tipo: tipo de notificación
    - usuarios_objetivo: array de usuarios que deberían recibir
    - mensaje: el mensaje de la notificación
    - tarea_id: id de la tarea (puede ser null)
    - success: si la inserción fue exitosa
    - error_message: mensaje de error si falló
    - created_at: timestamp

  3. Seguridad:
    - RLS habilitado
    - Solo usuarios autenticados pueden insertar
*/

CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  usuarios_objetivo text[] NOT NULL,
  mensaje text NOT NULL,
  tarea_id bigint,
  tarea_nombre text,
  proyecto text,
  exclude_current_user boolean DEFAULT false,
  requesting_user text,
  success boolean DEFAULT true,
  error_message text,
  notifications_created integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated to insert logs"
  ON notification_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to read logs"
  ON notification_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_tarea_id ON notification_logs(tarea_id);
