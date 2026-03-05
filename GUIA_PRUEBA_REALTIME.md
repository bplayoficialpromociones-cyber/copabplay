# Guía de Prueba del Sistema de Notificaciones en Tiempo Real

## Objetivo
Verificar que el sistema de notificaciones y actualización de tareas funciona correctamente en tiempo real para todos los usuarios conectados simultáneamente.

## Requisitos Previos
- 3 navegadores o pestañas en modo incógnito (o 3 navegadores diferentes)
- Usuarios de prueba: Maxi, Romina, Juano

## Configuración Inicial

### Paso 1: Abrir Sesiones Simultáneas
1. Abre **3 pestañas en modo incógnito** (o 3 navegadores diferentes)
2. En cada pestaña, ve a: `https://copabplay.com.ar/admin`
3. Inicia sesión con cada usuario:
   - **Pestaña 1**: Usuario `Maxi`
   - **Pestaña 2**: Usuario `Romina`
   - **Pestaña 3**: Usuario `Juano`

### Paso 2: Navegar a la Sección de Tareas
1. En cada pestaña, haz clic en el menú lateral en **"Tareas"**
2. Verifica que todos los usuarios ven la misma lista de tareas

## Pruebas a Realizar

### Prueba 1: Crear Nueva Tarea (desde Maxi)

**En la sesión de Maxi:**
1. Haz clic en el botón **"+ Nueva Tarea"**
2. Completa el formulario:
   - Nombre: "Prueba Realtime - Nueva Tarea"
   - Descripción: "Esta es una prueba de notificaciones en tiempo real"
   - Estado: "pendiente"
   - Asignada a: Selecciona **Maxi**, **Romina** y **Juano**
   - Proyecto: "Copa bplay"
3. Haz clic en **"Guardar"**

**Verificar en las sesiones de Romina y Juano:**
- [ ] ✅ La nueva tarea aparece **INMEDIATAMENTE** en la grilla de tareas
- [ ] ✅ Se muestra una notificación visual en la campana (badge rojo con número)
- [ ] ✅ Se reproduce un **sonido de notificación** (2 tonos)
- [ ] ✅ Al abrir el panel de notificaciones, aparece la alerta con animación
- [ ] ✅ El mensaje dice: "Se te ha asignado la tarea 'Prueba Realtime - Nueva Tarea'"

**Verificar en la sesión de Maxi:**
- [ ] ✅ La tarea aparece en su propia grilla
- [ ] ✅ Recibe una notificación que dice: "Has creado la tarea 'Prueba Realtime - Nueva Tarea'"
- [ ] ✅ Se reproduce el sonido de notificación

### Prueba 2: Modificar Tarea Existente (desde Romina)

**En la sesión de Romina:**
1. Localiza la tarea creada en la Prueba 1
2. Haz clic en el ícono de **editar** (lápiz)
3. Modifica la descripción: "TAREA MODIFICADA POR ROMINA - PRUEBA REALTIME"
4. Cambia el estado a: **"en revisión"**
5. Haz clic en **"Guardar"**

**Verificar en las sesiones de Maxi y Juano:**
- [ ] ✅ La tarea se actualiza **INMEDIATAMENTE** en la grilla
- [ ] ✅ El estado cambió a "en revisión" (color correspondiente)
- [ ] ✅ Se recibe una nueva notificación con sonido
- [ ] ✅ El mensaje indica: "La tarea 'Prueba Realtime - Nueva Tarea' ha sido modificada"

### Prueba 3: Agregar Comentario a Tarea (desde Juano)

**En la sesión de Juano:**
1. Localiza la tarea creada en la Prueba 1
2. Haz clic en el ícono de **comentarios** (bocadillo de diálogo)
3. Escribe un comentario: "Este es un comentario de prueba desde Juano"
4. Haz clic en **"Enviar"**

**Verificar en las sesiones de Maxi y Romina:**
- [ ] ✅ El contador de comentarios pendientes se actualiza en la tarea
- [ ] ✅ Se recibe una notificación con sonido
- [ ] ✅ El mensaje indica: "Se ha creado un comentario para la tarea..."
- [ ] ✅ Al abrir los comentarios de la tarea, el nuevo comentario es visible

### Prueba 4: Abrir Tarea desde Notificación

**En cualquier sesión:**
1. Haz clic en la **campana de notificaciones** (esquina superior derecha)
2. Selecciona una notificación
3. Haz clic en **"Ver tarea"**

**Verificar:**
- [ ] ✅ Se abre el modal de edición de la tarea correspondiente
- [ ] ✅ Se muestran todos los datos de la tarea correctamente
- [ ] ✅ Se pueden ver los comentarios si los hay
- [ ] ✅ La notificación desaparece del panel después de verla

### Prueba 5: Marcar Todas como Leídas

**En cualquier sesión:**
1. Abre el panel de notificaciones
2. Haz clic en **"Marcar todas como leídas"**

**Verificar:**
- [ ] ✅ Todas las notificaciones desaparecen del panel
- [ ] ✅ El contador de la campana se pone en 0
- [ ] ✅ Las tareas permanecen en la grilla (no se eliminan)

## Resultados Esperados

### ✅ Sistema Funcionando Correctamente Si:

1. **Sincronización en Tiempo Real:**
   - Todas las sesiones ven los cambios simultáneamente
   - La grilla de tareas se actualiza sin necesidad de recargar la página
   - Los contadores de comentarios se actualizan en tiempo real

2. **Notificaciones:**
   - Todos los usuarios asignados reciben notificaciones
   - Las notificaciones tienen sonido
   - Las notificaciones tienen animación visual
   - El contador de la campana es correcto

3. **Funcionalidad:**
   - El botón "Ver tarea" abre la tarea correctamente
   - Los comentarios se sincronizan en tiempo real
   - Las modificaciones de estado se reflejan inmediatamente

## Problemas Comunes y Soluciones

### ❌ No se reproduce el sonido
**Solución:** El navegador puede bloquear el audio automático. Haz clic en cualquier parte de la página para habilitar el audio.

### ❌ La tarea no aparece inmediatamente
**Solución:** Verifica en la consola del navegador (F12) que la suscripción al realtime esté activa. Deberías ver logs como:
```
Estado de suscripción a tareas (TasksManagement): SUBSCRIBED
```

### ❌ No llegan notificaciones
**Solución:** Verifica en la consola que las suscripciones estén activas:
```
[Usuario] Estado de suscripción a notificaciones: SUBSCRIBED
```

## Logs de Depuración

Abre la **Consola del Navegador** (F12 → Console) en cada sesión para ver logs detallados:

- `Cambio detectado en tareas (TasksManagement):` - Se detectó un cambio en la tabla de tareas
- `[Usuario] Notificación recibida:` - El usuario recibió una notificación
- `[Usuario] Cambio en tareas detectado:` - Se detectó un cambio relevante para el usuario
- `Estado de suscripción a...: SUBSCRIBED` - La suscripción está activa

## Conclusión

Si todas las pruebas pasan exitosamente, el sistema de notificaciones en tiempo real está funcionando correctamente. Todos los usuarios conectados simultáneamente verán:
- ✅ Actualizaciones de tareas en tiempo real
- ✅ Notificaciones con sonido y animación
- ✅ Sincronización completa entre todas las sesiones
