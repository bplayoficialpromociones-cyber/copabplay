
/*
  # Crear tabla de Gastos

  ## Descripción
  Tabla para gestionar las entradas y salidas de gastos del proyecto.
  Solo accesible por Super Admin.

  ## Nueva Tabla: gastos
  - `id` (uuid, PK) - Identificador único
  - `tipo` (text) - 'ingreso' o 'egreso'
  - `categoria` (text) - Categoría del gasto
  - `descripcion` (text) - Descripción detallada
  - `monto` (numeric) - Monto de la transacción
  - `moneda` (text) - Moneda (ARS, USD)
  - `fecha` (date) - Fecha de la transacción
  - `proyecto` (text) - Proyecto relacionado
  - `comprobante_url` (text, nullable) - URL del comprobante
  - `notas` (text, nullable) - Notas adicionales
  - `creado_por` (text) - Usuario que creó el registro
  - `created_at` (timestamptz) - Fecha de creación del registro
  - `updated_at` (timestamptz) - Fecha de última actualización

  ## Seguridad
  - RLS habilitado con políticas para anon
  - Control de acceso manejado en el frontend por rol (super_admin)
*/

CREATE TABLE IF NOT EXISTS gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  categoria text NOT NULL DEFAULT '',
  descripcion text NOT NULL DEFAULT '',
  monto numeric(15, 2) NOT NULL DEFAULT 0,
  moneda text NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS', 'USD')),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  proyecto text NOT NULL DEFAULT '',
  comprobante_url text,
  notas text,
  creado_por text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read gastos"
  ON gastos FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert gastos"
  ON gastos FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update gastos"
  ON gastos FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete gastos"
  ON gastos FOR DELETE
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_tipo ON gastos(tipo);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos(categoria);
CREATE INDEX IF NOT EXISTS idx_gastos_proyecto ON gastos(proyecto);
