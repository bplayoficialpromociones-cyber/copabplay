/*
  # Normalize mention casing in tareas and tarea_comentarios

  ## Summary
  This migration normalizes all @mention spans stored in the database so that
  the text content of each mention matches the canonical casing defined in the
  application (e.g., "maxi" -> "Maxi", "tobi" -> "Tobi", "NEGRA" -> "Negra").

  ## Tables affected
  - `tareas` column `descripcion_tarea`
  - `tarea_comentarios` column `contenido`

  ## How it works
  Each user name is replaced using a case-insensitive regex that targets only
  text inside `<span ... data-mention="true">NAME</span>` patterns, replacing
  the captured name with its canonical form.

  ## Important notes
  - Uses regexp_replace with the 'gi' flags (global, case-insensitive)
  - Targets only the text content between the mention span tags
  - Does NOT touch any other text in the HTML
  - Safe to run multiple times (idempotent)
*/

CREATE OR REPLACE FUNCTION normalize_mention_text(html text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  names text[][] := ARRAY[
    ARRAY['Lucila'],
    ARRAY['Tobi'],
    ARRAY['Max'],
    ARRAY['Maxi'],
    ARRAY['Negra'],
    ARRAY['Juano'],
    ARRAY['Romina'],
    ARRAY['Matias'],
    ARRAY['Tobias'],
    ARRAY['MaxUx'],
    ARRAY['Colo'],
    ARRAY['Mato'],
    ARRAY['Ro'],
    ARRAY['Romilandia'],
    ARRAY['Romilandia35'],
    ARRAY['Romulado'],
    ARRAY['Romulando'],
    ARRAY['Matute'],
    ARRAY['Locofierro'],
    ARRAY['Tripero'],
    ARRAY['Lucilera'],
    ARRAY['Toto'],
    ARRAY['Totonets'],
    ARRAY['Totonet22'],
    ARRAY['Totonets22'],
    ARRAY['Toto22'],
    ARRAY['Ale'],
    ARRAY['Alexis']
  ];
  pair text[];
  canonical text;
BEGIN
  result := html;
  IF result IS NULL THEN
    RETURN result;
  END IF;

  FOREACH pair SLICE 1 IN ARRAY names
  LOOP
    canonical := pair[1];
    result := regexp_replace(
      result,
      '(data-mention="true"[^>]*>)' || canonical || '(<\/span>)',
      '\1' || canonical || '\2',
      'gi'
    );
  END LOOP;

  RETURN result;
END;
$$;

UPDATE tarea_comentarios
SET contenido = normalize_mention_text(contenido)
WHERE contenido ILIKE '%data-mention%';

UPDATE tareas
SET descripcion_tarea = normalize_mention_text(descripcion_tarea)
WHERE descripcion_tarea ILIKE '%data-mention%';

DROP FUNCTION normalize_mention_text(text);
