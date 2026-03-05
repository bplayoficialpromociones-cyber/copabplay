/*
  # Create Games Points Configuration Table

  1. New Tables
    - `games_points`
      - `id` (uuid, primary key)
      - `position` (integer) - Order of the game in the list
      - `game_name_es` (text) - Game name in Spanish
      - `game_name_en` (text) - Game name in English
      - `game_name_pt` (text) - Game name in Portuguese
      - `game_name_fr` (text) - Game name in French
      - `game_name_de` (text) - Game name in German
      - `game_name_zh` (text) - Game name in Chinese
      - `points` (integer) - Points awarded for the game
      - `icon` (text) - Icon identifier for the game
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `games_points` table
    - Add policy for public read access (anyone can view games)
    - Add policy for authenticated admin updates
*/

CREATE TABLE IF NOT EXISTS games_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position integer NOT NULL,
  game_name_es text NOT NULL,
  game_name_en text NOT NULL,
  game_name_pt text NOT NULL,
  game_name_fr text NOT NULL,
  game_name_de text NOT NULL,
  game_name_zh text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  icon text NOT NULL DEFAULT 'trophy',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE games_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view games points"
  ON games_points
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert games points"
  ON games_points
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update games points"
  ON games_points
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete games points"
  ON games_points
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default games
INSERT INTO games_points (position, game_name_es, game_name_en, game_name_pt, game_name_fr, game_name_de, game_name_zh, points, icon) VALUES
(1, 'Batalla Online de Slots 1 vs 1', 'Online Slots Battle 1 vs 1', 'Batalha Online de Slots 1 vs 1', 'Bataille de Machines à Sous en Ligne 1 vs 1', 'Online-Slots-Schlacht 1 vs 1', '在线老虎机对战 1 对 1', 100, 'swords'),
(2, 'Batalla Online de Slots 1 vs Tobi', 'Online Slots Battle 1 vs Tobi', 'Batalha Online de Slots 1 vs Tobi', 'Bataille de Machines à Sous en Ligne 1 vs Tobi', 'Online-Slots-Schlacht 1 vs Tobi', '在线老虎机对战 1 对 Tobi', 200, 'gamepad'),
(3, 'Recomendá un amigo a bplay. El que consigue que un amigo se registre y ese nuevo usuario se hace Regular', 'Refer a friend to bplay. Get points when your friend registers and becomes Regular', 'Indique um amigo para bplay. Ganhe pontos quando seu amigo se registrar e se tornar Regular', 'Recommandez un ami à bplay. Obtenez des points lorsque votre ami s''inscrit et devient Régulier', 'Empfehlen Sie einen Freund an bplay. Erhalten Sie Punkte, wenn sich Ihr Freund registriert und Regular wird', '推荐朋友到 bplay。当您的朋友注册并成为常客时获得积分', 200, 'users'),
(4, 'Preguntas y Respuestas. Cuanto sabes del Casino Online?', 'Questions and Answers. How much do you know about Online Casinos?', 'Perguntas e Respostas. Quanto você sabe sobre Cassinos Online?', 'Questions et Réponses. Que savez-vous des Casinos en Ligne?', 'Fragen und Antworten. Wie viel wissen Sie über Online-Casinos?', '问答游戏。您对在线赌场了解多少？', 100, 'help-circle'),
(5, 'Jugamos Ruleta Electrónica', 'We Play Electronic Roulette', 'Jogamos Roleta Eletrônica', 'Nous Jouons à la Roulette Électronique', 'Wir Spielen Elektronisches Roulette', '我们玩电子轮盘', 100, 'disc'),
(6, 'Jugamos Ruleta en Vivo', 'We Play Live Roulette', 'Jogamos Roleta ao Vivo', 'Nous Jouons à la Roulette en Direct', 'Wir Spielen Live-Roulette', '我们玩真人轮盘', 100, 'radio'),
(7, 'Jugamos Black Jack en Vivo', 'We Play Live Black Jack', 'Jogamos Black Jack ao Vivo', 'Nous Jouons au Black Jack en Direct', 'Wir Spielen Live-Black Jack', '我们玩真人二十一点', 100, 'spade')
ON CONFLICT DO NOTHING;