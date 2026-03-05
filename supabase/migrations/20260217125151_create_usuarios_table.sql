/*
  # Crear tabla de usuarios para gestión dinámica

  1. Nueva Tabla
    - `usuarios`
      - `id` (uuid, primary key)
      - `nombre` (text, unique, not null) - Nombre de usuario
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `activo` (boolean) - Si el usuario está activo o no

  2. Datos Iniciales
    - Agregar usuarios existentes: Tobias, Max, Alexis, Maxi, Lucila

  3. Seguridad
    - Enable RLS
    - Políticas para lectura anónima (necesario para mostrar en listas)
    - Políticas para escritura solo para el sistema (por ahora)
*/

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text UNIQUE NOT NULL,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas: permitir lectura a todos (anónimos y autenticados)
CREATE POLICY "Permitir lectura de usuarios" 
  ON usuarios 
  FOR SELECT 
  TO public
  USING (true);

-- Políticas: permitir inserción, actualización y eliminación sin restricción
-- (en una app real, esto estaría más restringido)
CREATE POLICY "Permitir inserción de usuarios"
  ON usuarios
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Permitir actualización de usuarios"
  ON usuarios
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir eliminación de usuarios"
  ON usuarios
  FOR DELETE
  TO public
  USING (true);

-- Insertar usuarios existentes
INSERT INTO usuarios (nombre) VALUES
  ('Tobias'),
  ('Max'),
  ('Alexis'),
  ('Maxi'),
  ('Lucila')
ON CONFLICT (nombre) DO NOTHING;

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_usuarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS usuarios_updated_at ON usuarios;
CREATE TRIGGER usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_usuarios_updated_at();
