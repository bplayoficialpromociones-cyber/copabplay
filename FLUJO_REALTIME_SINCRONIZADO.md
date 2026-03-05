# Sincronización del Sistema de Real Time

## Problema Original

Cuando un usuario creaba una tarea asignada a múltiples usuarios, el flujo de notificaciones estaba desincronizado:

1. **Al 80% del proceso** ya empezaban a llegar las alertas sonoras
2. Las alertas llegaban **antes** de que la tarea apareciera en las grillas
3. Las alertas llegaban **antes** de que se enviaran los emails
4. El usuario creador escuchaba alertas mientras todavía estaba en el modal del formulario
5. Otros usuarios recibían alertas de una tarea que aún no veían en su grilla

## Solución Implementada

Se reorganizó el flujo para seguir esta secuencia estricta:

### Flujo Correcto para Crear/Modificar/Eliminar Tareas

**a) Operación DB al 100% + Sincronización de Grillas (0-85%)**
- Se completa la operación en la base de datos
- Se espera 2 segundos para que Realtime propague los cambios
- Todas las grillas de usuarios logueados se actualizan

**b) Sistema de Alertas con Sonido (85-95%)**
- Se crean las notificaciones en la tabla `notificaciones`
- **IMPORTANTE**: Las alertas sonoras solo se envían a los OTROS usuarios (no al usuario que crea/modifica/elimina)
- Realtime propaga estas notificaciones y se reproducen los sonidos

**c) Envío de Emails (95-100%)**
- Se envían los emails a TODOS los usuarios (incluyendo quien realizó la acción)
- Los emails se procesan de forma independiente

## Cambios Realizados

### 1. TasksManagement.tsx

#### Nueva función `createNotifications`
```typescript
const createNotifications = async (
  usuarios: string[],
  tipo: 'nueva_tarea' | 'nuevo_comentario' | 'tarea_modificada',
  mensaje: string | ((usuario: string) => string),
  tareaId: number,
  comentarioId?: string,
  tareaNombre?: string,
  proyecto?: string,
  excludeCurrentUser: boolean = false  // NUEVO parámetro
)
```

- Agregado parámetro `excludeCurrentUser` para excluir al usuario actual de las alertas sonoras
- Solo crea notificaciones para otros usuarios cuando `excludeCurrentUser = true`

#### Nueva función `sendEmailNotifications`
```typescript
const sendEmailNotifications = async (
  usuarios: string[],
  tipo: 'nueva_tarea' | 'nuevo_comentario' | 'tarea_modificada',
  mensaje: string | ((usuario: string) => string),
  tareaId: number,
  tareaNombre?: string,
  proyecto?: string
)
```

- Función separada para envío de emails
- Se ejecuta DESPUÉS de las alertas sonoras
- Envía a TODOS los usuarios incluyendo quien realiza la acción

#### Flujo en `handleSubmit` (Crear Tarea)
```
70%: Crear tarea en DB
75%: Sincronizar grillas (espera 2 seg)
90%: Enviar alertas (excluye currentUser)
95%: Enviar emails (incluye currentUser)
100%: Finalizar
```

#### Flujo en `handleSubmit` (Editar Tarea)
```
70%: Actualizar tarea en DB
75%: Sincronizar grillas (espera 2 seg)
85%: Progreso
90%: Enviar alertas (excluye currentUser)
95%: Enviar emails (incluye currentUser)
100%: Finalizar
```

#### Flujo en `handleDelete`
```
20%: Eliminar tarea de DB
40%: Eliminar archivos
60%: Sincronizar grillas (espera 2 seg)
80%: Enviar alertas (excluye currentUser)
90%: Enviar emails (incluye currentUser)
95%: Finalizar
```

### 2. TaskComments.tsx

#### Flujo en `addComment` (Crear Comentario)
```
25%: Guardar comentario en DB
50%: Sincronizar comentarios (espera 2 seg)
75%: Enviar alertas (solo otros usuarios)
90%: Enviar emails (solo otros usuarios)
100%: Finalizar
```

#### Flujo en `deleteComment` (Eliminar Comentario)
```
25%: Marcar comentario como eliminado
50%: Sincronizar comentarios (espera 2 seg)
75%: Enviar alertas (solo otros usuarios)
90%: Enviar emails (solo otros usuarios)
100%: Finalizar
```

## Comportamiento Actual

### Escenario de Prueba Original

**Usuario Maxi crea una tarea y se la asigna a sí mismo y a Juano:**

1. **0-75%**: Maxi ve el modal con la barra de progreso, la tarea se crea en DB
2. **75-85%**: Sistema espera 2 segundos. Realtime propaga la tarea
3. **85%**: La tarea aparece en la grilla de Maxi y en la de Juano (si está logueado)
4. **90%**: Solo Juano recibe alerta sonora (Maxi NO escucha nada porque él la creó)
5. **95%**: Se envían emails a Maxi y Juano
6. **100%**: Proceso completo

### Resultados

✅ **Grillas sincronizadas antes de alertas**: Los usuarios ven la tarea antes de recibir la alerta sonora

✅ **Sin alertas para el creador**: El usuario que crea/modifica/elimina NO escucha alertas propias

✅ **Emails para todos**: Todos los usuarios reciben confirmación por email, incluyendo quien realizó la acción

✅ **Sin desincronización**: El flujo es coherente y predecible

## Tiempo de Sincronización

Se utiliza un delay de **2000ms (2 segundos)** para permitir que el sistema de Realtime de Supabase propague los cambios a todas las sesiones activas antes de generar las alertas.

Este tiempo es conservador pero garantiza que:
- Las grillas de todos los usuarios se actualicen
- Los comentarios se refresquen
- El estado global del sistema sea consistente

## Logs de Seguimiento

El sistema ahora genera logs claros para seguimiento:

```typescript
console.log(`Notificaciones de alerta creadas para: ${targetUsuarios.join(', ')}`);
console.log(`Email sent successfully to ${usuario}`);
```

Esto permite verificar que:
- Las alertas solo van a los usuarios correctos
- Los emails se envían a todos los usuarios
- El flujo se ejecuta en el orden esperado
