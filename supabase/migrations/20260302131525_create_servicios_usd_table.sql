/*
  # Crear tabla de servicios en dólares (USD)

  ## Descripción
  Tabla para registrar todos los servicios que el proyecto adquiere en dólares americanos.
  Almacena el monto en USD y calcula automáticamente el equivalente en ARS según el dólar blue
  vigente al momento del registro. Solo accesible por Super Admin.

  ## Nueva tabla: servicios_usd

  ### Columnas
  - `id` (uuid, PK)
  - `nombre` (text) - Nombre descriptivo del servicio (ej: "Chat GPT Plus")
  - `categoria` (text) - Categoría del servicio (ej: "Herramienta IA", "Dominio", "Hosting", etc.)
  - `descripcion` (text) - Detalle adicional opcional
  - `monto_usd` (numeric) - Costo en dólares americanos
  - `dolar_blue_referencia` (numeric) - Cotización dólar blue al momento del registro (ARS por USD)
  - `monto_ars_equivalente` (numeric) - Equivalente calculado en ARS (monto_usd * dolar_blue_referencia)
  - `fecha` (date) - Fecha del pago/compra
  - `proyecto` (text) - Proyecto al que pertenece el gasto
  - `periodicidad` (text) - 'mensual', 'anual', 'unico', 'otro'
  - `estado` (text) - 'activo', 'cancelado', 'vencido'
  - `url_servicio` (text, nullable) - URL del servicio
  - `notas` (text, nullable) - Observaciones
  - `creado_por` (text) - Usuario que registró el servicio
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Seguridad
  - RLS habilitado con políticas para anon (control de acceso en el frontend por rol super_admin)
*/

CREATE TABLE IF NOT EXISTS servicios_usd (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT '',
  descripcion text NOT NULL DEFAULT '',
  monto_usd numeric(12, 2) NOT NULL DEFAULT 0,
  dolar_blue_referencia numeric(10, 2) NOT NULL DEFAULT 0,
  monto_ars_equivalente numeric(15, 2) NOT NULL DEFAULT 0,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  proyecto text NOT NULL DEFAULT 'General',
  periodicidad text NOT NULL DEFAULT 'mensual' CHECK (periodicidad IN ('mensual', 'anual', 'unico', 'otro')),
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cancelado', 'vencido')),
  url_servicio text,
  notas text,
  creado_por text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE servicios_usd ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read servicios_usd"
  ON servicios_usd FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert servicios_usd"
  ON servicios_usd FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update servicios_usd"
  ON servicios_usd FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete servicios_usd"
  ON servicios_usd FOR DELETE TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_servicios_usd_fecha ON servicios_usd(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_servicios_usd_categoria ON servicios_usd(categoria);
CREATE INDEX IF NOT EXISTS idx_servicios_usd_estado ON servicios_usd(estado);
CREATE INDEX IF NOT EXISTS idx_servicios_usd_proyecto ON servicios_usd(proyecto);

/*
  ## Datos iniciales: Categorías predefinidas de servicios

  Se cargan los servicios de referencia provistos por el usuario como ejemplos base
  (sin monto real, solo como plantilla de categorías disponibles en el sistema).
*/

CREATE TABLE IF NOT EXISTS servicios_usd_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text UNIQUE NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  icono text NOT NULL DEFAULT 'Globe',
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE servicios_usd_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read servicios_usd_categorias"
  ON servicios_usd_categorias FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert servicios_usd_categorias"
  ON servicios_usd_categorias FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update servicios_usd_categorias"
  ON servicios_usd_categorias FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete servicios_usd_categorias"
  ON servicios_usd_categorias FOR DELETE TO anon USING (true);

INSERT INTO servicios_usd_categorias (nombre, descripcion, icono, orden) VALUES
  ('Herramienta IA', 'Software y plataformas de inteligencia artificial', 'Bot', 1),
  ('Dominio', 'Registro y renovación de nombres de dominio', 'Globe', 2),
  ('Hosting', 'Alojamiento de servidores y aplicaciones', 'Server', 3),
  ('Servidor de Email', 'Servicios de correo electrónico', 'Mail', 4),
  ('Publicidad Digital', 'Campañas de ads en plataformas digitales', 'Megaphone', 5),
  ('Premios', 'Pago de premios en torneos y eventos', 'Trophy', 6),
  ('Software', 'Licencias y suscripciones de software', 'Package', 7),
  ('Otro', 'Otros servicios y pagos en dólares', 'Circle', 8)
ON CONFLICT (nombre) DO NOTHING;
