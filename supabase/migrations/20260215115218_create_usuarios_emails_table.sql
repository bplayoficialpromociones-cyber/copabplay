/*
  # Create User Emails Table

  1. New Tables
    - `usuarios_emails`
      - `id` (uuid, primary key)
      - `usuario` (text, unique) - User name (Tobias, Max, Alexis, Maxi)
      - `email` (text) - User email address
      - `activo` (boolean, default true) - Whether email notifications are active
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
  
  2. Security
    - Enable RLS on `usuarios_emails` table
    - Add policies for authenticated users to manage emails
  
  3. Initial Data
    - Insert default users (emails can be updated later)
*/

CREATE TABLE IF NOT EXISTS usuarios_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario text UNIQUE NOT NULL CHECK (usuario IN ('Tobias', 'Max', 'Alexis', 'Maxi')),
  email text NOT NULL,
  activo boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE usuarios_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read usuarios_emails"
  ON usuarios_emails
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update usuarios_emails"
  ON usuarios_emails
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default users with placeholder emails
INSERT INTO usuarios_emails (usuario, email) VALUES
  ('Tobias', 'tobias@copabplay.com.ar'),
  ('Max', 'max@copabplay.com.ar'),
  ('Alexis', 'alexis@copabplay.com.ar'),
  ('Maxi', 'maxi@copabplay.com.ar')
ON CONFLICT (usuario) DO NOTHING;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_usuarios_emails_usuario ON usuarios_emails(usuario);
CREATE INDEX IF NOT EXISTS idx_usuarios_emails_activo ON usuarios_emails(activo);