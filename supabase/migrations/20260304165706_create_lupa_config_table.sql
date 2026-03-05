/*
  # Crear tabla de configuracion para La Lupa de Tobi

  Almacena configuracion del sistema incluyendo tokens de Telegram.
  Los valores son legibles por las Edge Functions via service role key.
*/

CREATE TABLE IF NOT EXISTS lupa_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave text UNIQUE NOT NULL,
  valor text NOT NULL DEFAULT '',
  descripcion text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lupa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read lupa_config"
  ON lupa_config FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert lupa_config"
  ON lupa_config FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update lupa_config"
  ON lupa_config FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

INSERT INTO lupa_config (clave, valor, descripcion) VALUES
  ('telegram_bot_token', '8641176731:AAEIKtZsRTft7hhweV9LH6hOafesR_XybZM', 'Token del bot @lalupadetobibot'),
  ('telegram_chat_id', '', 'ID del canal de Telegram (completar una vez creado el canal)'),
  ('fetch_interval_hours', '4', 'Intervalo de actualizacion en horas')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now();
