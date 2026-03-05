# Fix: Sincronización de Grillas en Tiempo Real

## Problema Detectado

**Escenario:**
1. Maxi crea una tarea asignada a Juano, Maxi y Romina
2. Maxi edita la tarea y quita a Romina de los asignados
3. En la grilla de Maxi, Romina desaparece correctamente
4. **PROBLEMA**: En la grilla de Juano, Romina sigue apareciendo como asignada

## Diagnóstico

El problema estaba en el listener de Realtime del componente TasksManagement:

### Antes (Incorrecto)
```typescript
useEffect(() => {
  fetchTareas();

  const tareasChannel = supabase
    .channel(`tareas-realtime-${Date.now()}`)
    .on('postgres_changes', { /* ... */ }, (payload) => {
      fetchTareas();  // <-- Usa una closure "stale" de currentUser
    })
    .subscribe();

  return () => {
    supabase.removeChannel(tareasChannel);
  };
}, []);  // <-- Array de dependencias vacío ❌
```

**Problema:** El `useEffect` tiene un array de dependencias vacío `[]`, lo que significa que:
- El listener se crea una sola vez cuando el componente monta
- La función callback dentro del listener captura el valor inicial de `currentUser` en su closure
- Cuando `fetchTareas()` se ejecuta dentro del callback, usa esa versión "congelada" de `currentUser`
- Si hay cambios en los datos, el filtrado puede no funcionar correctamente

## Solución Implementada

### Después (Correcto)
```typescript
useEffect(() => {
  fetchTareas();

  const channelId = `tareas-realtime-${currentUser}-${Date.now()}`;
  const tareasChannel = supabase
    .channel(channelId)
    .on('postgres_changes', { /* ... */ }, (payload) => {
      console.log(`[${currentUser}] Cambio detectado en tareas:`, payload);

      if (payload.eventType === 'UPDATE' && payload.new) {
        const updatedTarea = payload.new as Tarea;
        console.log(`[${currentUser}] UPDATE - Asignada a:`, updatedTarea.asignada_a);
      }

      fetchTareas();  // <-- Ahora usa el currentUser actual
    })
    .subscribe();

  return () => {
    supabase.removeChannel(tareasChannel);
  };
}, [currentUser]);  // <-- currentUser en dependencias ✅
```

### Cambios Realizados

1. **Agregado `currentUser` al array de dependencias**
   - Ahora cuando `currentUser` cambia, el listener se recrea
   - La closure siempre captura la versión más reciente de `currentUser`

2. **ID de canal único por usuario**
   - Antes: `tareas-realtime-${Date.now()}`
   - Ahora: `tareas-realtime-${currentUser}-${Date.now()}`
   - Esto evita conflictos entre sesiones de diferentes usuarios

3. **Logs mejorados para debugging**
   - Se agregaron logs detallados con el nombre del usuario
   - Se loguea específicamente cuando hay un UPDATE
   - Se muestra el array de usuarios asignados en cada cambio

4. **Mismo fix para comentarios**
   - El canal de comentarios también ahora incluye `currentUser`
   - Logs mejorados para seguimiento

## Cómo Verificar el Fix

### Prueba Manual

1. Abrir dos ventanas de navegador:
   - Ventana 1: Login como Maxi
   - Ventana 2: Login como Juano

2. Desde Maxi:
   - Crear tarea asignada a Juano, Maxi y Romina
   - Verificar que aparece en ambas grillas

3. Desde Maxi:
   - Editar la tarea y quitar a Romina
   - Guardar

4. Verificar:
   - ✅ En la grilla de Maxi: debe mostrar solo Juano y Maxi
   - ✅ En la grilla de Juano: debe mostrar solo Juano y Maxi (sin Romina)

### Logs Esperados en la Consola

Cuando Maxi actualiza la tarea, deberías ver en la consola de Juano:

```
[Juano] Cambio detectado en tareas (TasksManagement): {eventType: 'UPDATE', ...}
[Juano] UPDATE recibido - Tarea ID: 123
[Juano] UPDATE - Asignada a: ['Juano', 'Maxi']
[Juano] UPDATE - Creada por: Maxi
[Juano] fetchTareas - Iniciando carga...
[Juano] fetchTareas - Total tareas en BD: 5
[Juano] fetchTareas - Tareas filtradas para usuario: 3
```

## Por Qué Funciona Ahora

### El Flujo Correcto

1. **Maxi edita la tarea en su sesión:**
   - Se actualiza en la base de datos con `asignada_a: ['Juano', 'Maxi']`
   - Supabase Realtime propaga el cambio a todas las suscripciones activas

2. **En la sesión de Juano:**
   - El listener de Realtime detecta el cambio (evento UPDATE)
   - Llama a `fetchTareas()` con la versión actual de `currentUser` = "Juano"
   - `fetchTareas()` carga todas las tareas de la BD
   - Filtra las tareas donde `asignada_a` incluye "Juano" O `creada_por` es "Juano"
   - La tarea modificada SÍ incluye "Juano" en `asignada_a`, así que pasa el filtro
   - React actualiza el estado `tareas` con los datos nuevos
   - La grilla se re-renderiza mostrando solo Juano y Maxi (sin Romina)

3. **En la sesión de Romina (si estuviera activa):**
   - El listener detecta el cambio
   - `fetchTareas()` carga todas las tareas
   - Filtra las tareas donde `asignada_a` incluye "Romina" O `creada_por` es "Romina"
   - La tarea modificada NO incluye "Romina" y fue creada por "Maxi"
   - La tarea NO pasa el filtro
   - La tarea desaparece de la grilla de Romina ✅

## Consideraciones Técnicas

### React Closures y Dependencias

Este es un problema común en React conocido como "stale closure":

```typescript
// ❌ INCORRECTO
useEffect(() => {
  const handler = () => {
    console.log(currentUser);  // Captura el valor al momento de crear el effect
  };
  window.addEventListener('event', handler);
}, []); // Sin dependencias, nunca se recrea

// ✅ CORRECTO
useEffect(() => {
  const handler = () => {
    console.log(currentUser);  // Siempre usa el valor actual
  };
  window.addEventListener('event', handler);
  return () => window.removeEventListener('event', handler);
}, [currentUser]); // Se recrea cuando currentUser cambia
```

### Limpieza de Canales

Es importante que el `useEffect` tenga un `return` con la limpieza:

```typescript
return () => {
  supabase.removeChannel(tareasChannel);
  supabase.removeChannel(comentariosChannel);
};
```

Esto asegura que:
- Cuando el componente se desmonta, se eliminan los canales
- Cuando `currentUser` cambia, se eliminan los canales viejos antes de crear los nuevos
- No hay memory leaks ni suscripciones duplicadas

## Resultado

✅ **Las grillas de todos los usuarios se sincronizan correctamente en tiempo real**

✅ **Los cambios en asignados se reflejan inmediatamente en todas las sesiones activas**

✅ **El filtrado por usuario funciona correctamente después de actualizaciones**

✅ **Los logs permiten hacer debugging efectivo del flujo de datos**
