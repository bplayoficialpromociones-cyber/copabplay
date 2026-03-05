
/*
  # Crear tablas para gestión de sueldos

  ## Descripción
  Sistema CRM para gestionar el pago de sueldos mensuales a los usuarios del sistema,
  basándose en las tareas realizadas. Solo accesible por Super Admin.

  ## Nuevas Tablas

  ### 1. sueldo_periodos
  Representa un período de liquidación (mes/año) para un usuario.
  - `id` (uuid, PK)
  - `usuario` (text) - Nombre del usuario (Tobias, Max, Alexis, Maxi, Lucila)
  - `anio` (int) - Año del período
  - `mes` (int) - Mes del período (1-12)
  - `monto_base` (numeric) - Sueldo base acordado para ese período
  - `monto_bonos` (numeric) - Bonos adicionales
  - `monto_descuentos` (numeric) - Descuentos aplicados
  - `monto_total` (numeric) - Total a pagar = base + bonos - descuentos
  - `estado` (text) - 'pendiente', 'pagado', 'cancelado'
  - `fecha_pago` (date, nullable) - Fecha en que se efectuó el pago
  - `notas` (text, nullable) - Observaciones
  - `creado_por` (text) - Super admin que generó la liquidación
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - UNIQUE (usuario, anio, mes) - Un solo período por usuario/mes/año

  ### 2. sueldo_items
  Items detalle que componen el sueldo de un período (tareas, bonos, descuentos).
  - `id` (uuid, PK)
  - `periodo_id` (uuid, FK a sueldo_periodos)
  - `tipo` (text) - 'tarea', 'bono', 'descuento', 'base'
  - `descripcion` (text) - Descripción del item
  - `tarea_id` (bigint, nullable) - ID de la tarea relacionada (si aplica)
  - `monto` (numeric) - Monto del item (positivo o negativo según tipo)
  - `created_at` (timestamptz)

  ## Seguridad
  - RLS habilitado con políticas para anon (control de acceso en frontend por rol super_admin)
*/

CREATE TABLE IF NOT EXISTS sueldo_periodos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario text NOT NULL DEFAULT '',
  anio integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  monto_base numeric(15, 2) NOT NULL DEFAULT 0,
  monto_bonos numeric(15, 2) NOT NULL DEFAULT 0,
  monto_descuentos numeric(15, 2) NOT NULL DEFAULT 0,
  monto_total numeric(15, 2) NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'cancelado')),
  fecha_pago date,
  notas text,
  creado_por text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (usuario, anio, mes)
);

ALTER TABLE sueldo_periodos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read sueldo_periodos"
  ON sueldo_periodos FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert sueldo_periodos"
  ON sueldo_periodos FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update sueldo_periodos"
  ON sueldo_periodos FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete sueldo_periodos"
  ON sueldo_periodos FOR DELETE TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_sueldo_periodos_usuario ON sueldo_periodos(usuario);
CREATE INDEX IF NOT EXISTS idx_sueldo_periodos_anio_mes ON sueldo_periodos(anio DESC, mes DESC);
CREATE INDEX IF NOT EXISTS idx_sueldo_periodos_estado ON sueldo_periodos(estado);

CREATE TABLE IF NOT EXISTS sueldo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id uuid NOT NULL REFERENCES sueldo_periodos(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'tarea' CHECK (tipo IN ('tarea', 'bono', 'descuento', 'base')),
  descripcion text NOT NULL DEFAULT '',
  tarea_id bigint,
  monto numeric(15, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sueldo_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read sueldo_items"
  ON sueldo_items FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert sueldo_items"
  ON sueldo_items FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update sueldo_items"
  ON sueldo_items FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete sueldo_items"
  ON sueldo_items FOR DELETE TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_sueldo_items_periodo_id ON sueldo_items(periodo_id);
