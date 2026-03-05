/*
  # Create Rankings Table for Copa bplay

  1. New Tables
    - `rankings`
      - `id` (uuid, primary key) - Unique identifier for each ranking entry
      - `player_name` (text) - Name of the player
      - `points` (integer) - Player's points/score
      - `position` (integer) - Current ranking position
      - `avatar_url` (text, optional) - URL to player's avatar image
      - `created_at` (timestamptz) - When the record was created
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `rankings` table
    - Add policy for public read access (for stream display)
    - Add policy for authenticated users to manage rankings
  
  3. Indexes
    - Index on position for fast sorting
    - Index on points for ranking calculations

  ## Notes
  - The table supports automatic ranking updates
  - Position is calculated based on points in descending order
  - Public read access allows the stream overlay to display rankings without auth
*/

CREATE TABLE IF NOT EXISTS rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  points integer DEFAULT 0 NOT NULL,
  position integer NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;

-- Create index for fast sorting by position
CREATE INDEX IF NOT EXISTS idx_rankings_position ON rankings(position);

-- Create index for sorting by points
CREATE INDEX IF NOT EXISTS idx_rankings_points ON rankings(points DESC);

-- Policy: Anyone can read rankings (for public stream display)
CREATE POLICY "Public read access for rankings"
  ON rankings
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Authenticated users can read rankings
CREATE POLICY "Authenticated users can read rankings"
  ON rankings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert rankings
CREATE POLICY "Authenticated users can insert rankings"
  ON rankings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update rankings
CREATE POLICY "Authenticated users can update rankings"
  ON rankings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete rankings
CREATE POLICY "Authenticated users can delete rankings"
  ON rankings
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_rankings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before update
CREATE TRIGGER rankings_updated_at_trigger
  BEFORE UPDATE ON rankings
  FOR EACH ROW
  EXECUTE FUNCTION update_rankings_updated_at();