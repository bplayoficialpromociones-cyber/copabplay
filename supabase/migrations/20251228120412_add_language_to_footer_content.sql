/*
  # Add language support to footer content

  1. Changes
    - Add `language` column to `footer_content` table
    - Add unique constraint on language to ensure one footer per language
    - Insert default Spanish content
    - Insert translations for all supported languages

  2. Security
    - Maintain existing RLS policies
*/

-- Add language column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'footer_content' AND column_name = 'language'
  ) THEN
    ALTER TABLE footer_content ADD COLUMN language text NOT NULL DEFAULT 'es';
  END IF;
END $$;

-- Add unique constraint on language
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'footer_content_language_key'
  ) THEN
    ALTER TABLE footer_content ADD CONSTRAINT footer_content_language_key UNIQUE (language);
  END IF;
END $$;

-- Update existing record to be Spanish
UPDATE footer_content SET language = 'es' WHERE language = 'es' OR id IS NOT NULL;

-- Insert English translation
INSERT INTO footer_content (language, content)
VALUES (
  'en',
  '<strong>IMPORTANT:</strong> To win prizes, you must have made at least 15 deposits in bplay during the month with a minimum value of $4,000 pesos each. The cup ends on 12/31/2025. Prizes will be paid via bank transfer or crypto from January 8 to 12. Before payment, we will audit points and deposits to ensure everything is correct. If a player does not meet the requirements for their prize, their position will be given to the next player in the ranking.'
)
ON CONFLICT (language) DO UPDATE SET content = EXCLUDED.content;

-- Insert Portuguese translation
INSERT INTO footer_content (language, content)
VALUES (
  'pt',
  '<strong>IMPORTANTE:</strong> Para ganhar prêmios, você deve ter feito pelo menos 15 depósitos no bplay durante o mês com um valor mínimo de $4.000 pesos cada. A copa termina em 31/12/2025. Os prêmios serão pagos por transferência bancária ou cripto de 8 a 12 de janeiro. Antes do pagamento, auditaremos pontos e depósitos para garantir que tudo esteja correto. Se um jogador não cumprir os requisitos para seu prêmio, sua posição será cedida ao próximo jogador no ranking.'
)
ON CONFLICT (language) DO UPDATE SET content = EXCLUDED.content;

-- Insert French translation
INSERT INTO footer_content (language, content)
VALUES (
  'fr',
  '<strong>IMPORTANT:</strong> Pour gagner des prix, vous devez avoir effectué au moins 15 dépôts sur bplay au cours du mois avec une valeur minimale de 4 000 $ pesos chacun. La coupe se termine le 31/12/2025. Les prix seront payés par virement bancaire ou crypto du 8 au 12 janvier. Avant le paiement, nous auditerons les points et les dépôts pour nous assurer que tout est correct. Si un joueur ne remplit pas les conditions requises pour son prix, sa position sera cédée au joueur suivant dans le classement.'
)
ON CONFLICT (language) DO UPDATE SET content = EXCLUDED.content;

-- Insert German translation
INSERT INTO footer_content (language, content)
VALUES (
  'de',
  '<strong>WICHTIG:</strong> Um Preise zu gewinnen, müssen Sie im Monat mindestens 15 Einzahlungen bei bplay mit einem Mindestwert von jeweils 4.000 $ Pesos getätigt haben. Der Pokal endet am 31.12.2025. Die Preise werden vom 8. bis 12. Januar per Banküberweisung oder Krypto ausgezahlt. Vor der Zahlung prüfen wir Punkte und Einzahlungen, um sicherzustellen, dass alles korrekt ist. Wenn ein Spieler die Anforderungen für seinen Preis nicht erfüllt, wird seine Position an den nächsten Spieler im Ranking vergeben.'
)
ON CONFLICT (language) DO UPDATE SET content = EXCLUDED.content;

-- Insert Chinese translation
INSERT INTO footer_content (language, content)
VALUES (
  'zh',
  '<strong>重要提示：</strong>要赢得奖品，您必须在当月至少在 bplay 进行 15 次存款，每次最低金额为 4,000 比索。比赛将于 2025 年 12 月 31 日结束。奖品将于 1 月 8 日至 12 日通过银行转账或加密货币支付。付款前，我们将审核积分和存款以确保一切正确。如果玩家不符合其奖品的要求，其位置将让给排名中的下一位玩家。'
)
ON CONFLICT (language) DO UPDATE SET content = EXCLUDED.content;
