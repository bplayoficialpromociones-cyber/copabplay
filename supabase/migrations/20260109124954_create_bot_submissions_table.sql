/*
  # Create Bot Submissions Tracking Table
  
  1. New Tables
    - `bot_submissions`
      - `id` (uuid, primary key)
      - `potential_client_id` (uuid, foreign key to potential_clients)
      - `nombre` (text) - Cliente's first name
      - `apellido` (text) - Cliente's last name
      - `dni` (text) - Cliente's DNI
      - `provincia` (text) - Cliente's province
      - `email` (text) - Cliente's email
      - `cuenta_bplay` (text) - Cliente's Bplay account
      - `status` (text) - Status: 'pending', 'success', 'error'
      - `error_message` (text, nullable) - Error details if failed
      - `ticket_subject` (text) - Subject line sent to Bplay
      - `ticket_description` (text) - Description sent to Bplay
      - `notification_sent` (boolean) - Whether notification email was sent
      - `created_at` (timestamptz) - When the submission was created
      - `processed_at` (timestamptz, nullable) - When it was processed
      
  2. Security
    - Enable RLS on `bot_submissions` table
    - Add policies for public read and admin manage
*/

-- Create bot_submissions table
CREATE TABLE IF NOT EXISTS bot_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  potential_client_id uuid REFERENCES potential_clients(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  apellido text NOT NULL,
  dni text NOT NULL,
  provincia text NOT NULL,
  email text NOT NULL,
  cuenta_bplay text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
  error_message text,
  ticket_subject text NOT NULL,
  ticket_description text NOT NULL,
  notification_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS
ALTER TABLE bot_submissions ENABLE ROW LEVEL SECURITY;

-- Public can read bot submissions
CREATE POLICY "Public can read bot submissions"
  ON bot_submissions FOR SELECT
  USING (true);

-- Admin can manage bot submissions
CREATE POLICY "Admin can manage bot submissions"
  ON bot_submissions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bot_submissions_status ON bot_submissions(status);
CREATE INDEX IF NOT EXISTS idx_bot_submissions_created_at ON bot_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_submissions_potential_client ON bot_submissions(potential_client_id);
