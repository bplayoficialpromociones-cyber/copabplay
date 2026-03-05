/*
  # Fix fecha_cierre trigger to include 'resuelta' state

  The previous trigger only set fecha_cierre when estado changed to 'cerrada'.
  This migration updates the trigger to also set fecha_cierre when estado changes to 'resuelta'.

  1. Changes
    - Updates trigger function to set fecha_cierre when estado = 'resuelta' OR 'cerrada'
    - Clears fecha_cierre if estado changes away from both 'resuelta' and 'cerrada'
*/

CREATE OR REPLACE FUNCTION set_fecha_cierre_on_estado_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado IN ('resuelta', 'cerrada') AND (OLD.estado IS NULL OR OLD.estado NOT IN ('resuelta', 'cerrada')) THEN
    NEW.fecha_cierre = now();
  ELSIF NEW.estado NOT IN ('resuelta', 'cerrada') AND OLD.estado IN ('resuelta', 'cerrada') THEN
    NEW.fecha_cierre = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
