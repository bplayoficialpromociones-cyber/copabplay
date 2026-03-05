# Solución: Sistema de Notificaciones en Tiempo Real

## Problema Identificado

Las notificaciones del sistema solo aparecían cuando un usuario iniciaba sesión, pero NO se actualizaban en tiempo real cuando ya tenían una sesión activa. Esto significa que:

- ✅ Al iniciar sesión, las notificaciones pendientes se cargaban correctamente
- ❌ Con sesión activa, nuevas tareas o comentarios NO generaban alertas inmediatas
- ❌ Los usuarios debían cerrar sesión y volver a entrar para ver nuevas notificaciones

## Causa Raíz

El componente `NotificationAlerts` tenía configurada una suscripción de Supabase Realtime, pero solo escuchaba cambios en la tabla `notificaciones`. Sin embargo, esto no era suficiente porque:

1. Las notificaciones se crean mediante una función en el frontend (`createNotifications`)
2. La suscripción existente no detectaba cambios relacionados con tareas y comentarios
3. No había sincronización activa entre las acciones en otras sesiones

## Solución Implementada

### 1. Suscripciones Múltiples en Tiempo Real

Se mejoró el componente `NotificationAlerts.tsx` para suscribirse a múltiples tablas:

```typescript
// Suscripción a notificaciones (original, mejorada)
const notificationsChannel = supabase
  .channel('notifications-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'notificaciones',
    filter: `usuario=eq.${currentUser}`
  }, (payload) => {
    console.log('Notificación recibida:', payload);
    fetchNotifications();
  })
  .subscribe();

// Nueva: Suscripción a cambios en tareas
const tasksChannel = supabase
  .channel('tasks-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tareas'
  }, (payload) => {
    // Verificar si el usuario está asignado
    if (payload.new && payload.new.asignada_a) {
      const asignados = payload.new.asignada_a;
      if (Array.isArray(asignados) && asignados.includes(currentUser)) {
        setTimeout(() => fetchNotifications(), 500);
      }
    }
  })
  .subscribe();

// Nueva: Suscripción a cambios en comentarios
const commentsChannel = supabase
  .channel('comments-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tarea_comentarios'
  }, (payload) => {
    setTimeout(() => fetchNotifications(), 500);
  })
  .subscribe();
```

### 2. Logs para Debugging

Se agregaron logs en consola para facilitar el debugging:
- Estado de las suscripciones (SUBSCRIBED, CLOSED, etc.)
- Eventos recibidos en tiempo real
- Verificaciones de asignación de tareas

### 3. Delay Estratégico

Se agregó un delay de 500ms antes de refrescar notificaciones para asegurar que:
- Las notificaciones se hayan creado en la base de datos
- Los edge functions hayan procesado los emails
- No haya conflictos de race conditions

## Beneficios

✅ **Notificaciones instantáneas**: Los usuarios reciben alertas inmediatamente cuando:
  - Se les asigna una nueva tarea
  - Alguien modifica una tarea asignada
  - Se crea un nuevo comentario
  - Se elimina o modifica un comentario

✅ **Sonido de alerta**: Las alertas nuevas reproducen el sonido característico

✅ **Animaciones visuales**: El ícono de campana se anima cuando llegan nuevas notificaciones

✅ **Sin necesidad de recargar**: Los usuarios no necesitan cerrar y abrir sesión

## Cómo Funciona el Flujo Completo

1. **Usuario A crea/modifica una tarea**
   - TasksManagement.tsx llama a `createNotifications()`
   - Se insertan registros en la tabla `notificaciones`
   - Se envían emails via edge function

2. **Supabase Realtime detecta el cambio**
   - El canal `notifications-changes` detecta el INSERT
   - También el canal `tasks-changes` detecta cambios en `tareas`
   - El canal `comments-changes` detecta cambios en `tarea_comentarios`

3. **Usuario B (con sesión activa) recibe la notificación**
   - El componente NotificationAlerts recibe el evento
   - Ejecuta `fetchNotifications()` para actualizar el estado
   - Reproduce el sonido de alerta
   - Muestra la animación en el ícono de campana
   - El contador se actualiza automáticamente

## Script de Prueba

Se creó el script `test-realtime-notifications.mjs` que:
- ✅ Verifica usuarios en el sistema
- ✅ Configura suscripciones en tiempo real
- ✅ Crea tareas y comentarios de prueba
- ✅ Monitorea si llegan las notificaciones
- ✅ Limpia los datos de prueba automáticamente

### Ejecutar el Test

```bash
node test-realtime-notifications.mjs
```

## Requisitos de Supabase

Para que esto funcione, es necesario que Supabase Realtime esté habilitado para:
- ✅ Tabla `notificaciones`
- ✅ Tabla `tareas`
- ✅ Tabla `tarea_comentarios`

## Archivos Modificados

1. **src/components/NotificationAlerts.tsx**
   - Agregadas suscripciones múltiples
   - Mejorado el logging
   - Agregados delays estratégicos

2. **test-realtime-notifications.mjs** (NUEVO)
   - Script de prueba completo
   - Verificación de todos los flujos

## Próximos Pasos Recomendados

1. Verificar en el panel de Supabase que Realtime esté habilitado
2. Monitorear los logs de la consola del navegador
3. Probar con múltiples usuarios simultáneos
4. Ajustar los delays si es necesario (actualmente 500ms)

## Notas Técnicas

- Las suscripciones se limpian automáticamente cuando el componente se desmonta
- Se usa `maybeSingle()` para evitar errores cuando no hay datos
- Los canales tienen nombres únicos para evitar conflictos
- El sistema es tolerante a fallos: si una suscripción falla, las otras siguen funcionando
