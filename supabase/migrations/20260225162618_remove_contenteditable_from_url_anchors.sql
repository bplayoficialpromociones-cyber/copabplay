/*
  # Remove contenteditable="false" attribute from URL anchor tags

  ## Summary
  Removes the `contenteditable="false"` attribute from all `<a data-url="true">` 
  anchor tags stored in `tareas.descripcion_tarea` and `tarea_comentarios.contenido`.
  This attribute was added by the rich text editor to prevent cursor entry but 
  it blocks click events in rendered (read-only) views.
*/

UPDATE tareas
SET descripcion_tarea = replace(
  descripcion_tarea,
  ' contenteditable="false"',
  ''
)
WHERE descripcion_tarea LIKE '% contenteditable="false"%';

UPDATE tarea_comentarios
SET contenido = replace(
  contenido,
  ' contenteditable="false"',
  ''
)
WHERE contenido LIKE '% contenteditable="false"%';
