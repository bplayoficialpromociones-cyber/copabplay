/*
  # Agregar campo número de documento a clientes potenciales

  1. Cambios
    - Agrega columna `numero_documento` a la tabla `potential_clients`
    - Tipo: text (para permitir formateo futuro)
    - Campo obligatorio (NOT NULL)
    - Se almacena solo números
  
  2. Notas
    - Campo requerido para todos los nuevos registros
    - Válido para DNI argentinos (nativos y extranjeros con ciudadanía)
    - Rango típico: 7-8 dígitos (1.000.000 a 99.999.999)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'potential_clients' AND column_name = 'numero_documento'
  ) THEN
    ALTER TABLE potential_clients ADD COLUMN numero_documento text NOT NULL DEFAULT '';
  END IF;
END $$;
