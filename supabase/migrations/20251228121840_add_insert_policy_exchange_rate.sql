/*
  # Add insert policy for exchange rate config

  1. Changes
    - Add policy for service role to insert exchange rate records
  
  2. Security
    - Only service role can insert new exchange rate records
*/

-- Policy for service role to insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'exchange_rate_config' 
    AND policyname = 'Service role can insert exchange rate'
  ) THEN
    CREATE POLICY "Service role can insert exchange rate"
      ON exchange_rate_config
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;
