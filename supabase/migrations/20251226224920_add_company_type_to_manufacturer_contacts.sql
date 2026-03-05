/*
  # Add company_type column to manufacturer_contacts

  1. Changes
    - Add `company_type` column to `manufacturer_contacts` table
      - Type: text
      - Constraint: Must be one of: 'Operador', 'Fabricante', 'Agregador', 'Otro Servicio'
      - Required field (NOT NULL)
  
  2. Notes
    - This field allows categorizing the type of company contacting through the manufacturer landing form
    - The check constraint ensures only valid values are stored
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manufacturer_contacts' AND column_name = 'company_type'
  ) THEN
    ALTER TABLE manufacturer_contacts 
    ADD COLUMN company_type text NOT NULL DEFAULT 'Fabricante'
    CHECK (company_type IN ('Operador', 'Fabricante', 'Agregador', 'Otro Servicio'));
  END IF;
END $$;