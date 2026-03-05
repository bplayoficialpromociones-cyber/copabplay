# Guía de Prueba: Sistema de Auditoría de Notificaciones

## 🎯 Objetivo

Implementé un sistema de auditoría que registra **TODOS los intentos** de crear notificaciones en la base de datos. Esto nos permite identificar exactamente por qué no llegan las notificaciones de eliminación.

---

## 📊 Tabla de Auditoría: `notification_logs`

Cada vez que se llama a `createNotifications()`, se registra:

- ✅ Tipo de notificación (`nueva_tarea`, `tarea_modificada`, `tarea_eliminada`, etc.)
- ✅ Usuarios objetivo (array)
- ✅ Mensaje de la notificación
- ✅ ID de la tarea
- ✅ Nombre de la tarea
- ✅ Proyecto
- ✅ Si se excluyó al usuario actual
- ✅ Quién hizo la petición
- ✅ Si fue exitoso o falló
- ✅ Mensaje de error (si falló)
- ✅ Cantidad de notificaciones creadas
- ✅ Timestamp

---

## 🧪 Cómo Probar

### Paso 1: Crear una tarea de prueba

1. Loguear como **Max**
2. Crear una tarea nueva:
   - Nombre: "Test Eliminación #123"
   - Asignar a: Juano, Romina
   - Proyecto: Cualquiera

### Paso 2: Eliminar la tarea

1. **Max** elimina la tarea "Test Eliminación #123"
2. Observar la consola del navegador (F12)

**Logs esperados en consola:**
```
[Max][abc123] 🔔 Iniciando createNotifications: {
  usuarios: ['Juano', 'Romina'],
  tipo: 'tarea_eliminada',
  tareaId: 89,
  tareaNombre: 'Test Eliminación #123',
  excludeCurrentUser: true
}
[Max][abc123] Usuarios después de excluir actual: ['Juano', 'Romina']
[Max][abc123] 📝 Insertando 2 notificaciones: [...]
[Max][abc123] ✅ 2 notificaciones creadas exitosamente
[Max][abc123] 📊 Log de auditoría creado
```

### Paso 3: Consultar la auditoría

Ejecutar esta query en la base de datos:

```sql
SELECT 
  id,
  tipo,
  usuarios_objetivo,
  mensaje,
  tarea_id,
  tarea_nombre,
  requesting_user,
  success,
  error_message,
  notifications_created,
  created_at
FROM notification_logs
WHERE tipo = 'tarea_eliminada'
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

**Resultado esperado:**
```
tipo: tarea_eliminada
usuarios_objetivo: {Juano, Romina}
mensaje: "Max eliminó la tarea "Test Eliminación #123""
tarea_id: 89
success: true
error_message: null
notifications_created: 2
```

### Paso 4: Verificar que las notificaciones se insertaron

```sql
SELECT 
  id,
  usuario,
  tipo,
  mensaje,
  tarea_id,
  leida,
  fecha_creacion
FROM notificaciones
WHERE tipo = 'tarea_eliminada'
  AND fecha_creacion > NOW() - INTERVAL '5 minutes'
ORDER BY fecha_creacion DESC;
```

**Resultado esperado:**
```
usuario: Juano
tipo: tarea_eliminada
mensaje: "Max eliminó la tarea "Test Eliminación #123""
tarea_id: null (porque la tarea fue eliminada)
leida: false

usuario: Romina
tipo: tarea_eliminada
mensaje: "Max eliminó la tarea "Test Eliminación #123""
tarea_id: null
leida: false
```

---

## 🔍 Posibles Escenarios

### Escenario A: Las notificaciones NO se crean

**Síntomas:**
- `notification_logs.success = false`
- `notification_logs.notifications_created = 0`
- `notification_logs.error_message` tiene un mensaje

**Causa:**
- Error en la inserción a la tabla `notificaciones`
- Puede ser un constraint violado o RLS bloqueando

**Solución:**
- Revisar el mensaje de error en `error_message`
- Verificar que el tipo `tarea_eliminada` esté permitido en el constraint
- Verificar políticas RLS

### Escenario B: Las notificaciones se crean pero no llegan a los usuarios

**Síntomas:**
- `notification_logs.success = true`
- `notification_logs.notifications_created > 0`
- Las notificaciones están en la tabla `notificaciones`
- Pero los usuarios NO las ven en la campana

**Causa:**
- Problema con Realtime
- Filtros en `NotificationAlerts.tsx` las están descartando

**Solución:**
- Verificar subscripción Realtime en consola
- Revisar filtros en `fetchNotifications()`

### Escenario C: usuarios_objetivo está vacío

**Síntomas:**
- `notification_logs.usuarios_objetivo = []`
- `notification_logs.error_message = 'No hay usuarios para notificar'`
- `notification_logs.notifications_created = 0`

**Causa:**
- `tareaInfo.asignados` estaba vacío al momento de la eliminación
- O todos los usuarios fueron excluidos

**Solución:**
- Verificar que la tarea tiene usuarios asignados antes de eliminar
- Revisar la lógica de `excludeCurrentUser`

### Escenario D: La función createNotifications NO se llamó

**Síntomas:**
- NO hay ningún registro en `notification_logs` para esa tarea
- NO hay logs en consola

**Causa:**
- La función `handleDelete` falló antes de llegar a `createNotifications`
- O el flujo tiene un `return` temprano

**Solución:**
- Revisar logs de consola para errores en `handleDelete`
- Verificar que no haya un `return` antes de llamar `createNotifications`

---

## 📝 Queries Útiles para Debug

### Ver TODOS los logs de las últimas 24 horas

```sql
SELECT 
  tipo,
  usuarios_objetivo,
  tarea_nombre,
  requesting_user,
  success,
  error_message,
  notifications_created,
  TO_CHAR(created_at, 'HH24:MI:SS') as hora
FROM notification_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Ver logs de eliminación que fallaron

```sql
SELECT 
  *
FROM notification_logs
WHERE tipo = 'tarea_eliminada'
  AND success = false
ORDER BY created_at DESC;
```

### Comparar logs vs notificaciones creadas

```sql
-- Total de intentos de crear notificaciones de eliminación
SELECT COUNT(*) as intentos, SUM(notifications_created) as creadas
FROM notification_logs
WHERE tipo = 'tarea_eliminada'
  AND created_at > NOW() - INTERVAL '1 hour';

-- Total de notificaciones de eliminación en la tabla
SELECT COUNT(*) as notificaciones_en_bd
FROM notificaciones
WHERE tipo = 'tarea_eliminada'
  AND fecha_creacion > NOW() - INTERVAL '1 hour';
```

---

## ✅ Checklist de Verificación

Cuando elimines una tarea, verifica:

1. ✅ **Logs en consola:**
   - Aparece `🔔 Iniciando createNotifications`
   - Aparece `✅ X notificaciones creadas exitosamente`
   - Aparece `📊 Log de auditoría creado`

2. ✅ **Base de datos - notification_logs:**
   - Hay un registro con `tipo = 'tarea_eliminada'`
   - `success = true`
   - `notifications_created > 0`
   - `error_message = null`

3. ✅ **Base de datos - notificaciones:**
   - Hay N registros (uno por usuario asignado)
   - `tipo = 'tarea_eliminada'`
   - `tarea_id = null` (porque la tarea fue eliminada)
   - `leida = false`

4. ✅ **Frontend - Campana:**
   - Los usuarios asignados ven la notificación
   - El ícono es ❌
   - El mensaje dice "X eliminó la tarea..."
   - NO aparece el botón "Ver tarea"

5. ✅ **Frontend - Alerta sonora:**
   - Suena la secuencia de 5 alertas
   - La campana tiembla
   - Aparece el tooltip "Tenes alertas pendientes!"

---

## 🚨 Si algo falla

Si después de eliminar una tarea:

1. **Primero:** Revisar logs de consola (F12)
2. **Segundo:** Consultar `notification_logs` en la BD
3. **Tercero:** Basado en el escenario identificado arriba, aplicar la solución

El sistema de auditoría te dirá **exactamente** qué está pasando:
- ¿Se llamó la función?
- ¿Qué usuarios se intentaron notificar?
- ¿Fue exitoso?
- ¿Cuántas notificaciones se crearon?
- ¿Cuál fue el error (si hubo)?

Con esta información podemos identificar y solucionar el problema definitivamente.
