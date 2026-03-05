/*
  # Add INSERT policy for usuarios_emails
  
  1. Updates
    - Add INSERT policy to allow authenticated users to create email records
  
  2. Security
    - Only authenticated users can insert records
    - Allows UPSERT operations to work correctly
*/

-- Add INSERT policy for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'usuarios_emails' 
    AND policyname = 'Allow authenticated users to insert usuarios_emails'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert usuarios_emails"
      ON usuarios_emails
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;