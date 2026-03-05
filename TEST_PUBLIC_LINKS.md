# Rutina de Pruebas - Links Públicos de Tareas

## Resumen
Esta rutina verifica que los links públicos de tareas funcionen correctamente, permitiendo que cualquier persona pueda ver una tarea completa sin necesidad de autenticación.

## Pre-requisitos
- El proyecto debe estar desplegado en producción
- La base de datos debe tener al menos una tarea creada con uuid_publico

## Tareas de Prueba Disponibles

### Tarea ID 20
- **Nombre**: Mirar ultimo Video de Crack Ball - Partido de Messi vs Barcelona de Ecuador
- **UUID Público**: 2c246df4-49d4-452b-a711-b19b466cbbeb
- **Link de Prueba**: `https://copabplay.com.ar/tarea/2c246df4-49d4-452b-a711-b19b466cbbeb`

## Checklist de Verificación

### 1. Navegación y Carga
- [ ] El link carga correctamente sin error 404
- [ ] No se redirige a la página de login
- [ ] La página carga todos los assets (CSS, JS) correctamente
- [ ] No hay errores en la consola del navegador

### 2. Visualización de Datos de la Tarea
- [ ] Se muestra el nombre de la tarea correctamente
- [ ] Se muestra el proyecto
- [ ] Se muestra el estado con el color correcto
- [ ] Se muestra la persona asignada
- [ ] Se muestra la fecha de creación
- [ ] Se muestra la fecha de cierre (si existe)
- [ ] Se muestra la descripción completa

### 3. Archivos Adjuntos
- [ ] Si la tarea tiene imagen, se muestra el link correctamente
- [ ] Si la tarea tiene video, se muestra el link correctamente
- [ ] Los links de archivos son accesibles y abren correctamente

### 4. Comentarios
- [ ] Se muestran todos los comentarios de la tarea
- [ ] Cada comentario muestra el autor
- [ ] Cada comentario muestra la fecha de creación
- [ ] Cada comentario muestra el estado (pendiente/resuelto)
- [ ] El contenido del comentario se renderiza correctamente
- [ ] Los comentarios están ordenados por fecha (más antiguos primero)

### 5. Modo Solo Lectura
- [ ] No hay botones de edición visibles
- [ ] No hay campos de entrada de texto para comentarios
- [ ] No hay opciones para modificar el estado
- [ ] Se muestra el mensaje "Esta es una vista de solo lectura"

### 6. Botón "Volver"
- [ ] El botón volver está visible
- [ ] Al hacer clic, redirige a la página principal

### 7. Responsive Design
- [ ] La página se ve correctamente en dispositivos móviles
- [ ] La página se ve correctamente en tablets
- [ ] La página se ve correctamente en desktop

### 8. Funcionalidad desde Admin Panel
- [ ] En el admin panel, se muestra el botón de compartir (icono Share2)
- [ ] Al hacer clic en el botón, se copia el link al portapapeles
- [ ] Se muestra una notificación de éxito al copiar el link
- [ ] El link copiado tiene el formato correcto: `https://copabplay.com.ar/tarea/[uuid]`

## Pruebas de Seguridad

### 1. Acceso Anónimo
- [ ] Se puede acceder a la tarea sin estar autenticado
- [ ] No se puede acceder a funciones de administrador
- [ ] Solo se pueden ver las tareas con uuid_publico válido

### 2. Intentos de Manipulación
- [ ] Un UUID inválido muestra el mensaje de error apropiado
- [ ] No se expone información sensible en los errores
- [ ] No se puede acceder a otras tareas modificando la URL

## Pasos para Ejecutar las Pruebas

### Prueba Manual Rápida

1. **Abrir navegador en modo incógnito** (para asegurar que no hay sesión activa)

2. **Acceder al link de prueba**:
   ```
   https://copabplay.com.ar/tarea/2c246df4-49d4-452b-a711-b19b466cbbeb
   ```

3. **Verificar que se carga la página** sin errores

4. **Abrir DevTools** (F12) y verificar:
   - Pestaña Console: No debe haber errores rojos
   - Pestaña Network: Todos los assets deben cargar con status 200

5. **Verificar contenido de la tarea**:
   - Nombre de la tarea visible
   - Descripción completa visible
   - Estado con color apropiado
   - Información del asignado

6. **Verificar comentarios** (si existen):
   - Se muestran todos los comentarios
   - Información completa de cada comentario

7. **Intentar acciones de edición** (no deben estar disponibles):
   - No debe haber botones de editar
   - No debe haber campos de entrada

8. **Probar botón "Volver"**:
   - Debe redirigir a la página principal

### Prueba desde Admin Panel

1. **Iniciar sesión** en el admin panel

2. **Ir a la sección de Gestión de Tareas**

3. **Localizar cualquier tarea** en la grilla

4. **Hacer clic en el botón de compartir** (icono de Share2)

5. **Verificar notificación** de que el link se copió

6. **Pegar el link** en una nueva ventana de incógnito

7. **Verificar** que se puede acceder a la tarea correctamente

## Problemas Comunes y Soluciones

### Error 404 al acceder al link
**Causa**: El archivo `netlify.toml` no tiene la configuración correcta de redirects
**Solución**: Verificar que `netlify.toml` contiene:
```toml
[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

### Assets no cargan (Error al cargar JS/CSS)
**Causa**: La configuración de Vite usa rutas relativas en lugar de absolutas
**Solución**: Verificar que `vite.config.ts` tiene `base: '/'`

### Error "Tarea no encontrada"
**Causa**: La tarea no existe o el UUID es incorrecto
**Solución**: Verificar en la base de datos que la tarea tiene un uuid_publico válido

### Error al cargar comentarios
**Causa**: Políticas RLS no permiten acceso anónimo a comentarios
**Solución**: Verificar que existe la política "Allow public read comments for shared tasks"

## Resultados Esperados

Al completar todas las pruebas exitosamente:

✅ Los links públicos funcionan correctamente
✅ Cualquier persona puede ver tareas compartidas
✅ No se requiere autenticación
✅ Solo se puede ver, no editar
✅ Los comentarios son visibles
✅ Los archivos adjuntos son accesibles
✅ El diseño es responsive

## Notas Adicionales

- Los links públicos son permanentes y no expiran
- Cada tarea tiene un UUID único que no se puede adivinar
- Los usuarios anónimos solo pueden leer, nunca modificar
- Los links se pueden compartir por cualquier medio (email, chat, etc.)
