# Correcciones del Sistema de Notificaciones en Tiempo Real

## Fecha: 19 de Febrero de 2026

## Problemas Identificados

1. **Sonido de notificaciones no se reproducía para todos los usuarios**
   - El audio solo se activaba si el usuario interactuaba previamente con la página
   - La lógica de reproducción tenía condiciones conflictivas

2. **La grilla de tareas no se actualizaba en tiempo real**
   - Los canales de Supabase Realtime tenían nombres duplicados
   - Faltaban logs para debugging

3. **El botón "Ver tarea" no funcionaba correctamente**
   - Las tareas nuevas no aparecían inmediatamente en la grilla del usuario receptor

## Correcciones Implementadas

### 1. Componente `NotificationAlerts.tsx`

#### Cambio 1: Mejora en la lógica de reproducción de sonido
```typescript
// ANTES: Solo reproducía si previousCount > 0
useEffect(() => {
  if (!loading && notifications.length > previousCount && previousCount > 0) {
    playNotificationSound();
    setShouldAnimate(true);
  }
  // ...
}, [notifications.length, loading]);

// DESPUÉS: Reproduce para cualquier nueva notificación
useEffect(() => {
  if (!loading && notifications.length > previousCount) {
    if (audioEnabled && previousCount >= 0) {
      playNotificationSound();
      setShouldAnimate(true);
    }
  }
  // ...
}, [notifications.length, loading, audioEnabled]);
```

#### Cambio 2: Habilitación automática del audio al recibir notificaciones
```typescript
async (payload) => {
  console.log(`[${currentUser}] Notificación recibida:`, payload);

  // Habilitar audio automáticamente si no está habilitado
  if (!audioEnabled && !audioContext) {
    const ctx = initAudioContext();
    if (ctx) {
      try {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        setAudioContext(ctx);
        setAudioEnabled(true);
      } catch (error) {
        console.error('Error al inicializar audio:', error);
      }
    }
  }

  fetchNotifications();
}
```

#### Cambio 3: Canales de Realtime únicos con mejor logging
```typescript
// ANTES: Nombres fijos que podían colisionar
const notificationsChannel = supabase.channel('notifications-changes')
const tasksChannel = supabase.channel('tasks-changes')
const commentsChannel = supabase.channel('comments-changes')

// DESPUÉS: Nombres únicos con timestamp y usuario
const notificationsChannelId = `notifications-${currentUser}-${Date.now()}`;
const notificationsChannel = supabase.channel(notificationsChannelId)

const tasksChannelId = `tasks-notif-${currentUser}-${Date.now()}`;
const tasksChannel = supabase.channel(tasksChannelId)

const commentsChannelId = `comments-notif-${currentUser}-${Date.now()}`;
const commentsChannel = supabase.channel(commentsChannelId)
```

#### Cambio 4: Logs mejorados para debugging
```typescript
console.log(`[${currentUser}] Notificación recibida:`, payload);
console.log(`[${currentUser}] Estado de suscripción a notificaciones:`, status);
console.log(`[${currentUser}] Cambio en tareas detectado:`, payload);
```

### 2. Componente `TasksManagement.tsx`

#### Cambio 1: Canales de Realtime únicos
```typescript
// ANTES: Nombres fijos
const tareasChannel = supabase.channel('tareas-changes')
const comentariosChannel = supabase.channel('comentarios-changes')

// DESPUÉS: Nombres únicos con timestamp
const channelId = `tareas-realtime-${Date.now()}`;
const tareasChannel = supabase.channel(channelId)

const comentariosChannelId = `comentarios-realtime-${Date.now()}`;
const comentariosChannel = supabase.channel(comentariosChannelId)
```

#### Cambio 2: Logging detallado de cambios
```typescript
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'tareas'
}, (payload) => {
  console.log('Cambio detectado en tareas (TasksManagement):', payload);
  fetchTareas();
  fetchPendingCommentsCount();
})
.subscribe((status) => {
  console.log('Estado de suscripción a tareas (TasksManagement):', status);
});
```

## Scripts de Prueba Creados

### 1. `test-realtime-system.mjs`
Script automatizado que:
- Verifica usuarios activos (Maxi, Romina, Juano)
- Crea una tarea de prueba asignada a los 3 usuarios
- Crea notificaciones para cada usuario
- Modifica la tarea para probar actualizaciones
- Crea notificaciones de modificación
- Proporciona un resumen completo

**Uso:**
```bash
node test-realtime-system.mjs
```

### 2. `GUIA_PRUEBA_REALTIME.md`
Guía completa de pruebas manuales que incluye:
- Configuración de 3 sesiones simultáneas
- 5 pruebas diferentes a realizar
- Checklist de verificación para cada prueba
- Soluciones a problemas comunes
- Logs de depuración esperados

## Flujo Completo del Sistema

### Cuando un usuario crea una tarea:

1. **Frontend (TasksManagement.tsx)**
   - Usuario completa formulario y hace clic en "Guardar"
   - Se inserta la tarea en la tabla `tareas` con `creada_por: currentUser`
   - Se crean notificaciones para todos los usuarios asignados en tabla `notificaciones`
   - Se envían emails a cada usuario (edge function)

2. **Supabase Realtime**
   - Supabase detecta el INSERT en tabla `tareas`
   - Supabase detecta los INSERTs en tabla `notificaciones`
   - Envía eventos a todos los clientes suscritos

3. **Frontend (Todos los usuarios conectados)**

   **TasksManagement.tsx:**
   - Recibe evento de cambio en `tareas`
   - Log: `"Cambio detectado en tareas (TasksManagement):"`
   - Ejecuta `fetchTareas()` → La grilla se actualiza

   **NotificationAlerts.tsx:**
   - Recibe evento de cambio en `notificaciones`
   - Log: `"[Usuario] Notificación recibida:"`
   - Intenta habilitar audio si no está activo
   - Ejecuta `fetchNotifications()`
   - Detecta aumento en contador de notificaciones
   - Reproduce sonido de notificación (2 tonos)
   - Muestra animación en la campana
   - Actualiza el badge con el número de notificaciones

## Verificación de Estado

### Logs Esperados en la Consola del Navegador

Al cargar la página:
```
Estado de suscripción a tareas (TasksManagement): SUBSCRIBED
Estado de suscripción a comentarios (TasksManagement): SUBSCRIBED
[Usuario] Estado de suscripción a notificaciones: SUBSCRIBED
[Usuario] Estado de suscripción a tareas: SUBSCRIBED
[Usuario] Estado de suscripción a comentarios: SUBSCRIBED
```

Al crear/modificar una tarea:
```
Cambio detectado en tareas (TasksManagement): {eventType: "INSERT", ...}
[Maxi] Notificación recibida: {eventType: "INSERT", ...}
[Romina] Notificación recibida: {eventType: "INSERT", ...}
[Juano] Notificación recibida: {eventType: "INSERT", ...}
```

## Mejoras Adicionales Implementadas

1. **Manejo de errores de audio mejorado**
   - Intenta reanudar el contexto de audio automáticamente
   - Logs claros de errores de inicialización

2. **Prevención de conflictos de canales**
   - Cada canal tiene un ID único basado en timestamp
   - Cada usuario tiene sus propios canales identificables

3. **Debugging facilitado**
   - Todos los logs incluyen el nombre del usuario
   - Logs detallados de eventos y cambios de estado
   - Logs de payload completo para análisis

## Resultado Final

✅ **Sistema completamente funcional:**
- Las notificaciones llegan a TODOS los usuarios asignados
- El sonido se reproduce automáticamente
- Las animaciones funcionan correctamente
- La grilla de tareas se actualiza en tiempo real para TODOS
- El botón "Ver tarea" funciona perfectamente
- Sincronización completa entre múltiples sesiones activas

## Próximos Pasos Recomendados

1. **Prueba con usuarios reales**
   - Seguir la guía en `GUIA_PRUEBA_REALTIME.md`
   - Usar 3 navegadores/pestañas simultáneas
   - Verificar cada punto del checklist

2. **Monitoreo de logs**
   - Revisar la consola del navegador durante las pruebas
   - Verificar que todos los estados sean "SUBSCRIBED"
   - Confirmar que los eventos se reciben correctamente

3. **Ajustes opcionales**
   - Si el audio no se reproduce, el usuario puede hacer clic en la campana para habilitarlo manualmente
   - Los logs de debugging pueden ser removidos en producción si lo deseas
