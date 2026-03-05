/*
  # Agregar campo Usuario_bplay a tabla rankings

  1. Cambios
    - Agregar columna `usuario_bplay` a la tabla `rankings`
      - Tipo: text
      - NOT NULL (obligatorio)
      - Valor por defecto: 'sin definir'
  
  2. Migración de datos
    - Todos los registros existentes tendrán el valor 'sin definir'
  
  3. Notas
    - Este campo identifica el usuario de Bplay asociado al jugador
    - Es editable desde el panel de administración
    - Se puede buscar y filtrar por este campo
*/

-- Agregar columna usuario_bplay a la tabla rankings
ALTER TABLE rankings 
ADD COLUMN IF NOT EXISTS usuario_bplay text NOT NULL DEFAULT 'sin definir';
