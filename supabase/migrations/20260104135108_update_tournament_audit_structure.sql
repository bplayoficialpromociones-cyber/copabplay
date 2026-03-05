/*
  # Actualización de estructura de Auditoría de Torneo

  1. Nuevas Tablas
    - `tournament_audit_imports`: Almacena información de archivos Excel importados
      - `id` (uuid, primary key)
      - `month` (integer): Mes del archivo
      - `year` (integer): Año del archivo
      - `original_filename` (text): Nombre original del archivo
      - `storage_path` (text): Ruta del archivo en Storage
      - `total_records` (integer): Total de registros importados
      - `bplay_users_count` (integer): Cantidad de usuarios BPlay
      - `uploaded_at` (timestamp): Fecha de subida
      - `uploaded_by` (text): Usuario que subió el archivo
    
    - `tournament_audit_records`: Almacena todos los registros del Excel
      - `id` (uuid, primary key)
      - `import_id` (uuid): Referencia al archivo importado
      - `jurisdiccion` (text)
      - `usuario_bplay` (text): Usuario que jugó la copa (puede ser null)
      - `fecha_registro` (date)
      - `estado` (text)
      - `afiliador` (text)
      - `subafiliador` (text)
      - `genero` (text)
      - `edad` (integer)
      - `dias_antiguedad` (integer)
      - `dias_ultima_apuesta` (integer)
      - `dias_ultima_conexion` (integer)
      - `num_depositos` (integer)
      - `depositos` (numeric)
      - `num_retiros` (integer)
      - `retiros` (numeric)
      - `depositos_netos` (numeric)
      - `apuestas_efectivo` (numeric)
      - `premios_efectivo` (numeric)
      - `ggr` (numeric)
      - `conversion_efectivo` (numeric)
      - `ajuste_efectivo` (numeric)
      - `beneficio` (numeric)
      - `balance_efectivo` (numeric)
      - `balance_bono` (numeric)
      - `balance_total` (numeric)
      - `apuestas_ef_casino` (numeric)
      - `porcentaje_casino` (numeric)
      - `apuestas_ef_deportes` (numeric)
      - `aadd` (numeric)
      - `tgm` (numeric)
      - `rlt` (numeric)
      - `pun` (numeric)
      - `poc` (numeric)
      - `blj` (numeric)
      - `dias_con_apuestas` (integer)
      - `dias_con_depositos` (integer)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS tournament_audit_records CASCADE;
DROP TABLE IF EXISTS tournament_audit_imports CASCADE;

-- Create imports table
CREATE TABLE IF NOT EXISTS tournament_audit_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL,
  year integer NOT NULL,
  original_filename text NOT NULL,
  storage_path text NOT NULL,
  total_records integer DEFAULT 0,
  bplay_users_count integer DEFAULT 0,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by text DEFAULT 'admin'
);

-- Create records table
CREATE TABLE IF NOT EXISTS tournament_audit_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES tournament_audit_imports(id) ON DELETE CASCADE,
  jurisdiccion text,
  usuario_bplay text,
  fecha_registro date,
  estado text,
  afiliador text,
  subafiliador text,
  genero text,
  edad integer,
  dias_antiguedad integer,
  dias_ultima_apuesta integer,
  dias_ultima_conexion integer,
  num_depositos integer,
  depositos numeric,
  num_retiros integer,
  retiros numeric,
  depositos_netos numeric,
  apuestas_efectivo numeric,
  premios_efectivo numeric,
  ggr numeric,
  conversion_efectivo numeric,
  ajuste_efectivo numeric,
  beneficio numeric,
  balance_efectivo numeric,
  balance_bono numeric,
  balance_total numeric,
  apuestas_ef_casino numeric,
  porcentaje_casino numeric,
  apuestas_ef_deportes numeric,
  aadd numeric,
  tgm numeric,
  rlt numeric,
  pun numeric,
  poc numeric,
  blj numeric,
  dias_con_apuestas integer,
  dias_con_depositos integer,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_imports_month_year ON tournament_audit_imports(year, month);
CREATE INDEX IF NOT EXISTS idx_audit_records_import_id ON tournament_audit_records(import_id);
CREATE INDEX IF NOT EXISTS idx_audit_records_usuario_bplay ON tournament_audit_records(usuario_bplay);

-- Enable RLS
ALTER TABLE tournament_audit_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_audit_records ENABLE ROW LEVEL SECURITY;

-- Policies for tournament_audit_imports
CREATE POLICY "Anyone can view tournament audit imports"
  ON tournament_audit_imports FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert tournament audit imports"
  ON tournament_audit_imports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tournament audit imports"
  ON tournament_audit_imports FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tournament audit imports"
  ON tournament_audit_imports FOR DELETE
  TO authenticated
  USING (true);

-- Policies for tournament_audit_records
CREATE POLICY "Anyone can view tournament audit records"
  ON tournament_audit_records FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert tournament audit records"
  ON tournament_audit_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tournament audit records"
  ON tournament_audit_records FOR DELETE
  TO authenticated
  USING (true);