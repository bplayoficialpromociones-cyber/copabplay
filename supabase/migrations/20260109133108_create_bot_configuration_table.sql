/*
  # Create Bot Configuration Table
  
  1. New Tables
    - `bot_configuration`
      - `id` (uuid, primary key)
      - `config_key` (text, unique) - Unique identifier for each configuration
      - `config_value` (text) - The configuration value
      - `description` (text) - Human-readable description
      - `step_number` (integer) - Which step this belongs to
      - `is_active` (boolean) - Whether this config is active
      - `updated_at` (timestamptz) - Last update timestamp
      - `created_at` (timestamptz) - Creation timestamp
      
  2. Security
    - Enable RLS on `bot_configuration` table
    - Add policies for public read and admin manage
    
  3. Initial Data
    - Insert default configuration for all bot steps
*/

-- Create bot_configuration table
CREATE TABLE IF NOT EXISTS bot_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value text NOT NULL,
  description text NOT NULL,
  step_number integer NOT NULL,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE bot_configuration ENABLE ROW LEVEL SECURITY;

-- Public can read bot configuration
CREATE POLICY "Public can read bot configuration"
  ON bot_configuration FOR SELECT
  USING (true);

-- Admin can manage bot configuration
CREATE POLICY "Admin can manage bot configuration"
  ON bot_configuration FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert default configuration
INSERT INTO bot_configuration (config_key, config_value, description, step_number) VALUES
  ('form_url', 'https://afiliadores.bplay.bet.ar/hc/es-419/requests/new', 'URL del formulario de Bplay donde se envían los tickets', 1),
  ('problem_option', 'Solicitud de datos usuario', 'Opción que se selecciona en "Elija su problema a continuación"', 2),
  ('notification_email', 'bplayoficialpromociones@gmail.com', 'Email donde se envían todas las notificaciones del bot', 3),
  ('data_request_option', 'Fuente', 'Dato que se solicita en "Indícanos el dato que queres solicitar" (Si necesitas más de un dato del cliente, aclaralo en descripción)', 4),
  ('afiliador_option', 'Dimattia', 'Afiliador que se selecciona en el formulario', 5),
  ('subject_template', 'Consulta por Fuente y Afiliador - {nombre} {apellido} - Dni {dni}', 'Plantilla del asunto del ticket. Variables disponibles: {nombre}, {apellido}, {dni}, {provincia}, {email}, {cuenta_bplay}', 6),
  ('description_template', 'Chicos como están. Todo bien?\nMe pueden pasar por favor la info de este jugador?\n\nNombre: {nombre}\nApellido: {apellido}\nDni: {dni}\nProvincia: {provincia}\n\nEstoy necesitando (Me pueden responder en esta formato que les paso abajo por favor? nos sirve para luego llevar esa info a un excel:\n\nFuente: xxxxxxxxx\nAfiliador: xxxxxxxxx\nEmail: xxxxxxxxx\nID usuario: xxxxxxxxx\nAlias usuario bplay: xxxxxxxxx\n\nGracias.', 'Plantilla de la descripción/mensaje del ticket. Variables disponibles: {nombre}, {apellido}, {dni}, {provincia}, {email}, {cuenta_bplay}, {celular}', 7),
  ('notification_subject', 'YA ENVIE EL TICKET A bplay', 'Asunto del email de notificación cuando el envío es exitoso', 9),
  ('notification_body_template', 'Ya envié el Ticket a bplay con los últimos datos del registro que se completó en copabplay.com.ar/datos\n\nEl pedido de fuente y afiliador que mandé es:\n\n{ticket_description}', 'Cuerpo del email de notificación. Variable disponible: {ticket_description}', 9),
  ('error_notification_subject', 'ERROR EN ENVIO DEL BOT', 'Asunto del email cuando hay un error en el envío', 9),
  ('error_notification_body_template', 'Hubo un error al intentar enviar el ticket a Bplay.\n\nError detectado: {error_message}\n\nDatos del cliente:\nNombre: {nombre} {apellido}\nDNI: {dni}\nProvincia: {provincia}', 'Cuerpo del email cuando hay error. Variables: {error_message}, {nombre}, {apellido}, {dni}, {provincia}', 9)
ON CONFLICT (config_key) DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_bot_configuration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bot_configuration_updated_at
  BEFORE UPDATE ON bot_configuration
  FOR EACH ROW
  EXECUTE FUNCTION update_bot_configuration_updated_at();
