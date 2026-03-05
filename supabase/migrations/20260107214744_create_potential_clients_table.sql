/*
  # Create Potential Clients Table

  ## Purpose
  Store potential customer data collected from the /datos landing page form.
  These are users interested in bplay who submit their information for follow-up.

  ## New Tables
  1. `potential_clients`
    - `id` (uuid, primary key) - Unique identifier
    - `nombre` (text) - First name
    - `apellido` (text) - Last name
    - `fecha_nacimiento` (date) - Date of birth
    - `email` (text) - Email address
    - `provincia` (text) - Province/State
    - `celular` (text) - Phone number with +54 prefix
    - `tiene_cuenta_bplay` (boolean) - Whether they already have a bplay account
    - `created_at` (timestamptz) - Timestamp of form submission
    - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on `potential_clients` table
  - Authenticated users (admins) can read all potential clients
  - Authenticated users (admins) can insert, update, and delete potential clients
  - Anonymous users can insert (to submit the form)
  
  ## Notes
  - This table captures leads from the /datos form
  - Data is also sent via email to bplayoficialpromociones@gmail.com
  - Admins can view and manage these leads from the admin panel
*/

-- Create potential_clients table
CREATE TABLE IF NOT EXISTS potential_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  apellido text NOT NULL,
  fecha_nacimiento date NOT NULL,
  email text NOT NULL,
  provincia text NOT NULL,
  celular text NOT NULL,
  tiene_cuenta_bplay boolean NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE potential_clients ENABLE ROW LEVEL SECURITY;

-- Policy: Anonymous users can insert (submit form)
CREATE POLICY "Anyone can submit potential client form"
  ON potential_clients
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Authenticated users (admins) can read all
CREATE POLICY "Admins can view all potential clients"
  ON potential_clients
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users (admins) can update
CREATE POLICY "Admins can update potential clients"
  ON potential_clients
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users (admins) can delete
CREATE POLICY "Admins can delete potential clients"
  ON potential_clients
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_potential_clients_email ON potential_clients(email);

-- Create index for created_at for sorting
CREATE INDEX IF NOT EXISTS idx_potential_clients_created_at ON potential_clients(created_at DESC);