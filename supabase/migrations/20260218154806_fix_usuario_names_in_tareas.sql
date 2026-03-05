/*
  # Fix usuario names in tareas

  1. Changes
    - Update all tareas with "Tobias" in asignada_a array to use "Tobi" instead
    - This ensures consistency with the username in admin_credentials table
  
  2. Notes
    - Affects 21 tareas that have "Tobias" assigned
    - Uses jsonb array manipulation to replace the value
*/

-- Create a temporary function to replace array values
CREATE OR REPLACE FUNCTION replace_in_jsonb_array(arr jsonb, old_val text, new_val text)
RETURNS jsonb AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  element jsonb;
BEGIN
  FOR element IN SELECT jsonb_array_elements(arr)
  LOOP
    IF element::text = concat('"', old_val, '"') THEN
      result := result || to_jsonb(new_val);
    ELSE
      result := result || element;
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update all tareas replacing "Tobias" with "Tobi" in asignada_a array
UPDATE tareas
SET asignada_a = replace_in_jsonb_array(asignada_a, 'Tobias', 'Tobi')
WHERE asignada_a::text LIKE '%Tobias%';

-- Drop the temporary function
DROP FUNCTION IF EXISTS replace_in_jsonb_array(jsonb, text, text);