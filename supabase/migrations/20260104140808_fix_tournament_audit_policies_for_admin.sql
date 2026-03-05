/*
  # Arreglar políticas RLS para auditoría de torneo
  
  1. Cambios
    - Cambiar políticas de "authenticated" a "public" para ambas tablas
    - El admin usa admin_credentials, no Supabase Auth
    - La seguridad se maneja a nivel de aplicación
  
  2. Tablas afectadas
    - tournament_audit_imports
    - tournament_audit_records
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can insert tournament audit imports" ON tournament_audit_imports;
DROP POLICY IF EXISTS "Authenticated users can update tournament audit imports" ON tournament_audit_imports;
DROP POLICY IF EXISTS "Authenticated users can delete tournament audit imports" ON tournament_audit_imports;
DROP POLICY IF EXISTS "Authenticated users can insert tournament audit records" ON tournament_audit_records;
DROP POLICY IF EXISTS "Authenticated users can delete tournament audit records" ON tournament_audit_records;

-- Create new public policies for tournament_audit_imports
CREATE POLICY "Public can insert tournament audit imports"
  ON tournament_audit_imports FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update tournament audit imports"
  ON tournament_audit_imports FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete tournament audit imports"
  ON tournament_audit_imports FOR DELETE
  TO public
  USING (true);

-- Create new public policies for tournament_audit_records
CREATE POLICY "Public can insert tournament audit records"
  ON tournament_audit_records FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update tournament audit records"
  ON tournament_audit_records FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete tournament audit records"
  ON tournament_audit_records FOR DELETE
  TO public
  USING (true);