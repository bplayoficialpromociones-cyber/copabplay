/*
  # Ampliar exchange_rate_config con datos del dólar blue

  ## Descripción
  Agrega columnas para almacenar los valores de compra, venta y promedio del dólar blue
  provenientes de la API dolarapi.com, así como metadata de la última actualización automática.

  ## Cambios en tabla: exchange_rate_config

  ### Nuevas columnas
  - `usd_to_ars` (numeric) - Cotización inversa: cuántos ARS vale 1 USD (valor blue promedio)
  - `dolar_blue_compra` (numeric) - Precio de compra del dólar blue
  - `dolar_blue_venta` (numeric) - Precio de venta del dólar blue
  - `dolar_blue_promedio` (numeric) - Promedio entre compra y venta
  - `fuente` (text) - Fuente de la cotización (ej: 'dolarapi.com')
  - `ultima_actualizacion_auto` (timestamptz) - Cuándo fue la última actualización automática

  ## Notas
  - Se mantiene la columna `ars_to_usd` existente por compatibilidad (inverso de usd_to_ars)
  - Se agrega política de INSERT para anon sobre exchange_rate_config
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exchange_rate_config' AND column_name = 'usd_to_ars'
  ) THEN
    ALTER TABLE exchange_rate_config ADD COLUMN usd_to_ars numeric(10, 2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exchange_rate_config' AND column_name = 'dolar_blue_compra'
  ) THEN
    ALTER TABLE exchange_rate_config ADD COLUMN dolar_blue_compra numeric(10, 2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exchange_rate_config' AND column_name = 'dolar_blue_venta'
  ) THEN
    ALTER TABLE exchange_rate_config ADD COLUMN dolar_blue_venta numeric(10, 2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exchange_rate_config' AND column_name = 'dolar_blue_promedio'
  ) THEN
    ALTER TABLE exchange_rate_config ADD COLUMN dolar_blue_promedio numeric(10, 2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exchange_rate_config' AND column_name = 'fuente'
  ) THEN
    ALTER TABLE exchange_rate_config ADD COLUMN fuente text DEFAULT 'manual';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exchange_rate_config' AND column_name = 'ultima_actualizacion_auto'
  ) THEN
    ALTER TABLE exchange_rate_config ADD COLUMN ultima_actualizacion_auto timestamptz;
  END IF;
END $$;

-- Permitir a anon hacer INSERT (necesario para la edge function con anon key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'exchange_rate_config' AND policyname = 'Anon can insert exchange rate'
  ) THEN
    CREATE POLICY "Anon can insert exchange rate"
      ON exchange_rate_config
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- Permitir a anon hacer UPDATE (para la edge function con anon key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'exchange_rate_config' AND policyname = 'Anon can update exchange rate'
  ) THEN
    CREATE POLICY "Anon can update exchange rate"
      ON exchange_rate_config
      FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
