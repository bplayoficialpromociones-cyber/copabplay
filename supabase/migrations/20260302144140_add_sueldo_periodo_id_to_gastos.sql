/*
  # Link gastos to sueldo_periodos

  ## Summary
  Adds a nullable foreign-key column `sueldo_periodo_id` to the `gastos` table so that
  salary liquidations created in the Sueldos module are automatically reflected as expense
  entries in the Gastos module.

  ## Changes
  - `gastos`: new nullable column `sueldo_periodo_id` (uuid, references sueldo_periodos on delete set null)
  - Index on `sueldo_periodo_id` for efficient lookups

  ## Notes
  - Existing rows are unaffected (column defaults to NULL)
  - When a sueldo_periodo is deleted the corresponding gasto row stays but loses the reference
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gastos' AND column_name = 'sueldo_periodo_id'
  ) THEN
    ALTER TABLE gastos
      ADD COLUMN sueldo_periodo_id uuid REFERENCES sueldo_periodos(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS gastos_sueldo_periodo_id_idx ON gastos(sueldo_periodo_id);
