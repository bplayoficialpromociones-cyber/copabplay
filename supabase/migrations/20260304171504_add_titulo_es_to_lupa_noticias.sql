/*
  # Agregar campos de traduccion a lupa_noticias

  - `titulo_es`: titulo traducido al espanol (siempre)
  - `titulo_original`: titulo en idioma original (el campo titulo pasa a ser siempre el ES)

  Estrategia:
  - titulo_es: titulo en espanol (nuevo campo)
  - titulo: se mantiene como esta (idioma original)
  - descripcion: descripcion en idioma original (se mantiene)
  - descripcion_es: descripcion en espanol (ya existe)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lupa_noticias' AND column_name = 'titulo_es'
  ) THEN
    ALTER TABLE lupa_noticias ADD COLUMN titulo_es text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lupa_noticias' AND column_name = 'titulo_original'
  ) THEN
    ALTER TABLE lupa_noticias ADD COLUMN titulo_original text DEFAULT '';
  END IF;
END $$;

/*
  Para hilos: agregar titulo_es para mostrar resumen descriptivo
*/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lupa_hilos' AND column_name = 'titulo_es'
  ) THEN
    ALTER TABLE lupa_hilos ADD COLUMN titulo_es text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lupa_hilos' AND column_name = 'resumen'
  ) THEN
    ALTER TABLE lupa_hilos ADD COLUMN resumen text DEFAULT '';
  END IF;
END $$;
