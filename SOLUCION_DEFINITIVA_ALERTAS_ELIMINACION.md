# Solución Definitiva: Alertas de Eliminación de Tareas

## Problema Identificado

Las notificaciones de eliminación de tareas NO llegaban a los usuarios. Al eliminar la tarea 87, se observaron estos errores:

### Error 1: 401 Unauthorized en notification_logs
```
POST https://.../rest/v1/notification_logs 401 (Unauthorized)
```

**Causa**: Las políticas RLS requerían autenticación, pero el sistema usa conexión anónima.

### Error 2: Foreign Key Constraint Violation
```
Error al insertar notificaciones:
{code: '23503', details: 'Key is not present in table "tareas".', 
hint: null, message: 'insert or update on table "notificaciones" violates 
foreign key constraint "notificaciones_tarea_id_fkey"'}
```

**Causa**: El flujo eliminaba la tarea PRIMERO, y luego intentaba crear notificaciones con un `tarea_id` que ya no existía.

---

## Soluciones Implementadas

### Fix 1: Políticas RLS para notification_logs

**Archivo**: `supabase/migrations/[timestamp]_fix_notification_logs_rls_for_anon.sql`

Cambié las políticas de `authenticated` a `anon, authenticated`:

```sql
-- Permitir a TODOS (anon y authenticated) insertar logs
CREATE POLICY "Allow insert logs"
  ON notification_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Permitir a TODOS leer logs
CREATE POLICY "Allow read logs"
  ON notification_logs
  FOR SELECT
  TO anon, authenticated
  USING (true);
```

**Resultado**: Los logs de auditoría ahora se crean correctamente.

---

### Fix 2: Reordenar el Flujo de Eliminación

**Archivo**: `src/components/TasksManagement.tsx`

**ANTES** (orden incorrecto):
```
1. Eliminar tarea de BD → tarea_id=87 YA NO EXISTE
2. Esperar 3.5 seg
3. Enviar emails → funciona (no usa FK)
4. Crear notificaciones → ERROR: tarea_id=87 no existe
```

**DESPUÉS** (orden correcto):
```
1. Crear notificaciones → ✅ tarea_id=87 existe, FK válida
2. Enviar emails → ✅ funciona
3. Eliminar tarea de BD → ✅ tarea eliminada
4. Esperar 3.5 seg → ✅ Realtime sincroniza grillas
5. Eliminar archivos del storage → ✅ limpieza
```

**Código cambiado**:
```typescript
// PASO 1: Crear notificaciones ANTES de eliminar
await createNotifications(
  tareaInfo.asignados,
  'tarea_eliminada',
  `${currentUser} eliminó la tarea "${tareaInfo.nombre}"`,
  tareaInfo.id, // ✅ La tarea todavía existe, FK válida
  undefined,
  tareaInfo.nombre,
  tareaInfo.proyecto,
  true
);

// PASO 2: Enviar emails
await sendEmailNotifications(...);

// PASO 3: AHORA SÍ eliminamos la tarea
const { error } = await supabase
  .from('tareas')
  .delete()
  .eq('id', tarea.id);
```

---

## Comportamiento Esperado Ahora

### 1. Usuario Maxi elimina tarea #87

**Consola de Maxi**:
```
[Maxi][abc123] Iniciando eliminación de tarea: Real time test
[Maxi][abc123] Usuarios asignados: ['Juano', 'Maxi', 'Romina']
[Maxi][abc123] 🔔 Iniciando createNotifications
[Maxi][abc123] Usuarios después de excluir actual: ['Juano', 'Romina']
[Maxi][abc123] 📝 Insertando 2 notificaciones
[Maxi][abc123] ✅ 2 notificaciones creadas exitosamente
[Maxi][abc123] 📊 Log de auditoría creado
```

### 2. Usuario Juano recibe notificación

**Consola de Juano**:
```
[Juano] Notificación recibida vía Realtime:
▶ Object { schema: "public", table: "notificaciones", commit_timestamp: "...", 
eventtype: "INSERT", new: {…}, old: {}, errors: null }

[Juano] Tipo de evento: INSERT
[Juano] Nueva notificación - Tipo: tarea_eliminada, Mensaje: "Maxi eliminó la tarea "Real time test""
[Juano] 🔔 Reproduciendo secuencia de alertas...
[Juano] 🔔 Secuencia de alertas iniciada (5 repeticiones)
```

**Frontend de Juano**:
- 🔔 Campana con badge "1"
- 🔴 Tooltip "Tenes alertas pendientes!"
- 🎵 5 alertas sonoras
- ⚡ Animación de temblor en la campana
- 📋 Panel de alertas muestra: "Maxi eliminó la tarea 'Real time test'" con icono ❌

### 3. Base de Datos

**Tabla `notificaciones`**:
```sql
usuario: Juano
tipo: tarea_eliminada
mensaje: "Maxi eliminó la tarea "Real time test""
tarea_id: 87 (luego cambia a NULL cuando se elimina la tarea)
leida: false
fecha_creacion: 2026-02-21 15:27:33
```

**Tabla `notification_logs`**:
```sql
tipo: tarea_eliminada
usuarios_objetivo: {Juano, Romina}
mensaje: "Maxi eliminó la tarea "Real time test""
tarea_id: 87
success: true
error_message: null
notifications_created: 2
```

---

## Verificación de la Solución

### Checklist de Validación

Cuando elimines una tarea, verifica:

✅ **Consola del eliminador (Maxi)**:
- Aparece `🔔 Iniciando createNotifications`
- Aparece `✅ 2 notificaciones creadas exitosamente`
- NO hay error 401
- NO hay error "Key is not present in table 'tareas'"

✅ **Consola del receptor (Juano)**:
- Aparece `Nueva notificación - Tipo: tarea_eliminada`
- Aparece `🔔 Reproduciendo secuencia de alertas...`
- Aparece `🔔 Secuencia de alertas iniciada (5 repeticiones)`

✅ **Frontend del receptor**:
- Campana muestra badge con número
- Suena la secuencia de 5 alertas
- Panel de alertas muestra la notificación con ícono ❌
- Mensaje dice "X eliminó la tarea 'Y'"

✅ **Base de datos**:
- `notification_logs` tiene registro con `success=true`
- `notificaciones` tiene registros para cada usuario asignado
- NO hay errores en `notification_logs.error_message`

---

## Queries de Verificación

### Ver logs de auditoría recientes
```sql
SELECT 
  tipo,
  usuarios_objetivo,
  tarea_nombre,
  success,
  error_message,
  notifications_created,
  TO_CHAR(created_at, 'HH24:MI:SS') as hora
FROM notification_logs
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
```

### Ver notificaciones de eliminación recientes
```sql
SELECT 
  usuario,
  mensaje,
  tarea_id,
  leida,
  TO_CHAR(fecha_creacion, 'HH24:MI:SS') as hora
FROM notificaciones
WHERE tipo = 'tarea_eliminada'
  AND fecha_creacion > NOW() - INTERVAL '10 minutes'
ORDER BY fecha_creacion DESC;
```

---

## Arquitectura del Sistema Completo

### Flujo de Eliminación (Actualizado)

```
Usuario Maxi clickea "Eliminar tarea #87"
     |
     v
[TasksManagement.tsx - handleDelete()]
     |
     ├─> PASO 1: createNotifications() ✅ tarea_id=87 válido
     |   └─> Inserta en tabla "notificaciones"
     |       └─> Realtime broadcast a todos los usuarios
     |           └─> NotificationAlerts.tsx recibe evento
     |               └─> Reproduce secuencia de 5 alertas
     |               └─> Muestra badge en campana
     |               └─> Agrega al panel de alertas
     |
     ├─> PASO 2: sendEmailNotifications() ✅ funciona
     |   └─> Llama edge function "send-task-notification-email"
     |       └─> Envía emails a usuarios asignados
     |
     ├─> PASO 3: DELETE FROM tareas WHERE id=87 ✅ eliminada
     |   └─> ON DELETE SET NULL en notificaciones.tarea_id
     |   └─> Realtime broadcast DELETE a todos los usuarios
     |       └─> TasksManagement.tsx recibe evento
     |           └─> Remueve tarea de la grilla
     |
     ├─> PASO 4: Espera 3.5 seg ✅ sincronización
     |
     └─> PASO 5: storage.remove() ✅ limpieza
```

### Sistema de Auditoría

```
createNotifications() llamada
     |
     ├─> try {
     |     └─> Inserta en "notificaciones"
     |         ├─> Success: notifications_created = N
     |         └─> Error: error_message = "..."
     |   }
     |
     └─> finally {
           └─> Inserta en "notification_logs"
               ├─> tipo
               ├─> usuarios_objetivo
               ├─> tarea_id
               ├─> success (true/false)
               ├─> error_message (null o error)
               └─> notifications_created (N o 0)
         }
```

---

## Resumen

**Problemas solucionados**:
1. ✅ Error 401 en notification_logs → RLS actualizado para permitir anon
2. ✅ Error de FK al crear notificaciones → Reordenado: crear notificaciones ANTES de eliminar tarea
3. ✅ Sistema de auditoría → notification_logs registra TODOS los intentos

**Resultado**:
- Las notificaciones de eliminación ahora se crean correctamente
- Los usuarios reciben las alertas sonoras
- La campana muestra el badge correcto
- El panel de alertas muestra la notificación con el ícono ❌
- Todo queda registrado en la tabla de auditoría para debug futuro
