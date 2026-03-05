/*
  # Create Email Logs Table

  1. New Tables
    - `email_logs`
      - `id` (uuid, primary key)
      - `destinatario` (text) - Email recipient
      - `usuario` (text) - User name
      - `asunto` (text) - Email subject
      - `cuerpo` (text) - Email body
      - `tipo` (text) - Type: nueva_tarea, nuevo_comentario, tarea_modificada
      - `notificacion_id` (uuid, nullable) - Related notification ID
      - `tarea_id` (bigint, nullable) - Related task ID
      - `estado` (text) - Status: enviado, fallido, pendiente
      - `error_mensaje` (text, nullable) - Error message if failed
      - `servicio_usado` (text, nullable) - Email service used
      - `fecha_envio` (timestamptz) - Send timestamp
      - `metadata` (jsonb, nullable) - Additional metadata
  
  2. Security
    - Enable RLS on `email_logs` table
    - Add policies for anonymous users (admin panel uses localStorage auth)
  
  3. Indexes
    - Add indexes for common queries
*/

CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario text NOT NULL,
  usuario text NOT NULL,
  asunto text NOT NULL,
  cuerpo text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('nueva_tarea', 'nuevo_comentario', 'tarea_modificada', 'comentario_eliminado')),
  notificacion_id uuid,
  tarea_id bigint,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('enviado', 'fallido', 'pendiente')),
  error_mensaje text,
  servicio_usado text,
  fecha_envio timestamptz DEFAULT now() NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon users to read and insert email logs
CREATE POLICY "Allow anon to read email_logs"
  ON email_logs
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert email_logs"
  ON email_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update email_logs"
  ON email_logs
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_logs_usuario ON email_logs(usuario);
CREATE INDEX IF NOT EXISTS idx_email_logs_estado ON email_logs(estado);
CREATE INDEX IF NOT EXISTS idx_email_logs_tipo ON email_logs(tipo);
CREATE INDEX IF NOT EXISTS idx_email_logs_fecha_envio ON email_logs(fecha_envio DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_tarea_id ON email_logs(tarea_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_notificacion_id ON email_logs(notificacion_id);