/*
  # Add exchange rate configuration

  1. New Tables
    - `exchange_rate_config`
      - `id` (uuid, primary key)
      - `ars_to_usd` (numeric) - Exchange rate from Argentine Pesos to USD
      - `updated_at` (timestamptz)
  
  2. Changes
    - Insert default exchange rate (1 USD = 1000 ARS approximately)
  
  3. Security
    - Enable RLS on `exchange_rate_config` table
    - Add policy for public read access
    - Add policy for service role to update
*/

-- Create exchange rate config table
CREATE TABLE IF NOT EXISTS exchange_rate_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ars_to_usd numeric NOT NULL DEFAULT 0.001,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE exchange_rate_config ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (anyone can read the exchange rate)
CREATE POLICY "Anyone can read exchange rate"
  ON exchange_rate_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy for service role to update
CREATE POLICY "Service role can update exchange rate"
  ON exchange_rate_config
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert default exchange rate if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM exchange_rate_config) THEN
    INSERT INTO exchange_rate_config (ars_to_usd)
    VALUES (0.001);
  END IF;
END $$;
