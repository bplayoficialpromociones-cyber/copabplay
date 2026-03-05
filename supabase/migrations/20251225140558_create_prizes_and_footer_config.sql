/*
  # Create Prize and Footer Configuration Tables

  1. New Tables
    - `prizes_config`
      - `id` (uuid, primary key) - Unique identifier
      - `position` (integer) - Prize position (1st, 2nd, 3rd)
      - `amount` (text) - Prize amount as text (e.g., "$250.000")
      - `currency` (text) - Currency label (e.g., "PESOS")
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `footer_content`
      - `id` (uuid, primary key) - Unique identifier
      - `content` (text) - HTML content for the footer
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated admin users to read
    - Add policies for authenticated admin users to update

  3. Initial Data
    - Insert default prize values
    - Insert default footer content

  ## Important Notes
  - These tables will store configuration that appears on the public ranking page
  - Only one record should exist per position in prizes_config
  - Only one record should exist in footer_content
  - Admin panel will allow editing these values
*/

-- Create prizes_config table
CREATE TABLE IF NOT EXISTS prizes_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position integer UNIQUE NOT NULL,
  amount text NOT NULL,
  currency text DEFAULT 'PESOS',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create footer_content table
CREATE TABLE IF NOT EXISTS footer_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE prizes_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_content ENABLE ROW LEVEL SECURITY;

-- Policies for prizes_config (anyone can read, only authenticated can update)
CREATE POLICY "Anyone can read prizes"
  ON prizes_config FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can update prizes"
  ON prizes_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for footer_content (anyone can read, only authenticated can update)
CREATE POLICY "Anyone can read footer"
  ON footer_content FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can update footer"
  ON footer_content FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default prize values
INSERT INTO prizes_config (position, amount, currency) VALUES
  (1, '$250.000', 'PESOS'),
  (2, '$75.000', 'PESOS'),
  (3, '$50.000', 'PESOS')
ON CONFLICT (position) DO NOTHING;

-- Insert default footer content
INSERT INTO footer_content (content) VALUES
  ('<p><span style="color: #FFD700; font-weight: bold; font-size: 1.125rem;">IMPORTANTE:</span> Para poder ganar los premios tenés que tener hechos en bplay al menos <span style="color: #00FF87; font-weight: bold; font-size: 1.125rem;">15 depósitos</span> en el mes de un valor de <span style="color: #00FF87; font-weight: bold; font-size: 1.125rem;">$4.000 pesos o más</span>. La copa finaliza el <span style="color: #FF4444; font-weight: bold; font-size: 1.125rem;">31/12/2025</span>. Los premios se pagan por <span style="color: #FFD700; font-weight: bold;">transferencia o crypto</span> del <span style="color: #00FF87; font-weight: bold;">8 al 12 de Enero</span>. Antes, fiscalizaremos los puntos y depósitos de los jugadores para ver que todo esté bien. En caso de que un jugador no cumpla los requisitos para otorgar su premio, su lugar será cedido al jugador que ocupa la posición siguiente del ranking.</p>')
ON CONFLICT DO NOTHING;