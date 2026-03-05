/*
  # Linkify plain-text URLs in tareas and comentarios

  ## Summary
  This migration scans all existing HTML content in `tareas.descripcion_tarea`
  and `tarea_comentarios.contenido` and wraps any plain-text URLs (that are not
  already inside an <a> tag) with a styled anchor tag that opens in a new tab
  and is styled red (matching the rich-text editor behavior).

  ## What it does
  1. Defines a helper function `linkify_html_urls(text)` that uses regex to find
     URLs not already wrapped in an anchor and replaces them.
  2. Updates `tareas.descripcion_tarea` for all rows.
  3. Updates `tarea_comentarios.contenido` for all rows.
  4. Drops the helper function after use.

  ## URL pattern
  Matches http://, https://, www. prefixed URLs and common bare domains
  (e.g., copabplay.com.ar, google.com, etc.).
*/

CREATE OR REPLACE FUNCTION linkify_html_urls(content text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
BEGIN
  -- Replace URLs not already inside an <a href= tag
  -- Strategy: replace bare URLs with anchor tags
  -- Pattern matches: http(s)://... or www. prefixed URLs
  result := regexp_replace(
    content,
    '(?<!href=")(?<!href='')(?<![=>])((?:https?://|www\.)[^\s<,;]+)',
    '<a href="https://\1" target="_blank" rel="noopener noreferrer" data-url="true" style="color:#dc2626;text-decoration:underline;cursor:pointer;">\1</a>',
    'gi'
  );
  
  -- Fix double https:// that can happen when URL already starts with https://
  result := regexp_replace(
    result,
    'href="https://https://',
    'href="https://',
    'g'
  );
  result := regexp_replace(
    result,
    'href="https://http://',
    'href="http://',
    'g'
  );
  
  RETURN result;
END;
$$;

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Update tareas descriptions
  FOR r IN SELECT id, descripcion_tarea FROM tareas WHERE descripcion_tarea IS NOT NULL AND descripcion_tarea <> ''
  LOOP
    -- Only process rows that have URLs not already in anchor tags
    IF r.descripcion_tarea ~ '(?<!href=")(?<!href='')(?<![=>])((?:https?://|www\.)[^\s<,;]+)' THEN
      UPDATE tareas 
      SET descripcion_tarea = linkify_html_urls(r.descripcion_tarea)
      WHERE id = r.id;
    END IF;
  END LOOP;

  -- Update comentarios contenido
  FOR r IN SELECT id, contenido FROM tarea_comentarios WHERE contenido IS NOT NULL AND contenido <> '' AND (eliminado IS NULL OR eliminado = false)
  LOOP
    IF r.contenido ~ '(?<!href=")(?<!href='')(?<![=>])((?:https?://|www\.)[^\s<,;]+)' THEN
      UPDATE tarea_comentarios 
      SET contenido = linkify_html_urls(r.contenido)
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS linkify_html_urls(text);
