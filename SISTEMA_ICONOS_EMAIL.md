# Sistema de Gestión de Iconos para Emails

## Descripción

Sistema completo para personalizar los iconos que aparecen en los emails de notificación del sistema de tareas. Permite seleccionar entre más de 60 iconos diferentes organizados por categorías.

## Características

### 1. Galería de Iconos Amplia

**Más de 60 iconos disponibles** organizados en categorías:

- **Tareas** (10 iconos): Task, Todo List, Checklist, etc.
- **Edición** (7 iconos): Edit, Pencil, Create, etc.
- **Eliminación** (6 iconos): Delete Sign, Trash, Delete Forever, etc.
- **Comentarios** (9 iconos): Chat, Speech Bubble, Comment, etc.
- **Notificaciones** (3 iconos): Bell, Reminder, etc.
- **Estado** (6 iconos): OK, Checkmark, Error, Warning, etc.
- **Email** (4 iconos): Email, Email Open, New Post, etc.
- **Usuarios** (3 iconos): User, User Circle, Team, etc.
- **Documentos** (3 iconos): Document, File, Note, etc.
- **Tiempo** (3 iconos): Clock, Calendar, Time, etc.
- **Otros** (3 iconos): Star, Lightning, Info, etc.

### 2. Tipos de Notificación Soportados

El sistema permite configurar iconos para 6 tipos de notificación:

1. **Nueva Tarea** - Cuando se crea una nueva tarea
2. **Tarea Modificada** - Cuando se modifica una tarea existente
3. **Tarea Eliminada** - Cuando se elimina una tarea
4. **Nuevo Comentario** - Cuando se agrega un comentario
5. **Comentario Modificado** - Cuando se edita un comentario
6. **Comentario Eliminado** - Cuando se elimina un comentario

### 3. Interfaz Intuitiva

- **Vista de Configuración Actual**: Muestra los iconos configurados para cada tipo
- **Galería Modal**: Selección visual de iconos con vista previa
- **Filtrado por Categoría**: Navegación rápida entre categorías
- **Botón "Restaurar por Defecto"**: Vuelve a la configuración inicial
- **Actualización en Tiempo Real**: Los cambios se aplican inmediatamente

## Ubicación en el Admin Panel

1. Iniciar sesión como **Super Admin**
2. En el menú lateral, buscar **"Iconos de Email"** (icono de sobre)
3. Solo visible para usuarios con rol `super_admin`

## Cómo Usar

### Cambiar un Icono

1. En la vista de "Configuración Actual", hacer clic en el tipo de notificación que deseas cambiar
2. Se abrirá un modal con la galería de iconos
3. Usar los botones de categoría para filtrar los iconos
4. Hacer clic en el icono deseado
5. El cambio se guarda automáticamente

### Restaurar Valores por Defecto

1. Hacer clic en el botón **"Restaurar por Defecto"** en la esquina superior derecha
2. Confirmar la acción
3. Todos los iconos vuelven a la configuración inicial

## Iconos por Defecto

| Tipo de Notificación | Icono por Defecto | URL |
|---------------------|-------------------|-----|
| Nueva Tarea | Task (Azul) | `https://img.icons8.com/fluency/96/task.png` |
| Tarea Modificada | Edit (Amarillo) | `https://img.icons8.com/fluency/96/edit.png` |
| Tarea Eliminada | Delete Sign (Rojo) | `https://img.icons8.com/fluency/96/delete-sign.png` |
| Nuevo Comentario | Chat (Verde) | `https://img.icons8.com/fluency/96/chat.png` |
| Comentario Modificado | Edit Message (Amarillo) | `https://img.icons8.com/fluency/96/edit-message.png` |
| Comentario Eliminado | Delete Message (Rojo) | `https://img.icons8.com/fluency/96/delete-message.png` |

## Estructura de la Base de Datos

### Tabla: `email_icons_config`

```sql
CREATE TABLE email_icons_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_notificacion text UNIQUE NOT NULL,
  icono_url text NOT NULL,
  icono_nombre text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Columnas:**
- `id`: Identificador único (UUID)
- `tipo_notificacion`: Tipo de notificación (clave única)
- `icono_url`: URL del icono seleccionado
- `icono_nombre`: Nombre descriptivo del icono
- `created_at`: Fecha de creación
- `updated_at`: Fecha de última actualización

### Row Level Security (RLS)

- **Lectura pública**: Todos pueden leer (necesario para enviar emails)
- **Escritura anónima**: Solo anon puede insertar/actualizar (Admin Panel)

## Integración con Edge Function

La edge function `send-task-notification-email` ha sido actualizada para:

1. **Obtener configuración**: Lee el icono configurado desde `email_icons_config`
2. **Usar icono personalizado**: Si existe configuración, usa ese icono
3. **Fallback a valores por defecto**: Si no hay configuración, usa iconos por defecto
4. **Renderizar en HTML**: Muestra el icono en el header del email

### Flujo de la Edge Function

```typescript
// 1. Obtener configuración de iconos
const { data: iconConfig } = await supabase
  .from('email_icons_config')
  .select('tipo_notificacion, icono_url')
  .eq('tipo_notificacion', notification.tipo)
  .maybeSingle();

// 2. Generar HTML con icono personalizado
const htmlBody = getEmailBody(notification, iconConfig?.icono_url);

// 3. En getEmailBody(), usar icono configurado o por defecto
const iconUrl = customIconUrl || defaultIcons[notification.tipo] || fallbackIcon;
```

## Ejemplo de Email Generado

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); }
    .icon-image { width: 96px; height: 96px; margin-bottom: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://img.icons8.com/fluency/96/task.png" alt="Icon" class="icon-image" />
      <h1>Nueva Tarea</h1>
    </div>
    <div class="content">
      <!-- Contenido del email -->
    </div>
  </div>
</body>
</html>
```

## Componentes del Sistema

### 1. `EmailIconsManagement.tsx`

**Responsabilidades:**
- Mostrar configuración actual de iconos
- Galería de iconos disponibles con filtros
- Actualizar configuración en la base de datos
- Restaurar valores por defecto

**Estado:**
```typescript
- configs: IconConfig[]          // Configuración actual
- selectedTipo: string | null    // Tipo seleccionado para edición
- filterCategoria: string        // Categoría activa en galería
- loading: boolean               // Estado de carga
- saving: boolean                // Estado de guardado
```

**Funciones principales:**
```typescript
- fetchConfigs()                 // Obtener configuración actual
- updateIcon()                   // Actualizar icono de un tipo
- resetToDefaults()              // Restaurar valores por defecto
```

### 2. Edge Function: `send-task-notification-email`

**Archivo:** `supabase/functions/send-task-notification-email/index.ts`

**Cambios realizados:**
1. Consulta a `email_icons_config` para obtener icono personalizado
2. Función `getEmailBody()` acepta parámetro `customIconUrl`
3. Reemplazo de emojis por tags `<img>` con URLs de iconos
4. Fallback a iconos por defecto si no hay configuración

## Fuente de Iconos

**Proveedor:** Icons8 (https://icons8.com)

**Características:**
- Iconos de alta calidad (96x96px)
- Estilos consistentes: Fluency y Color
- URLs públicas y estables
- Optimizados para web

**Formato de URL:**
```
https://img.icons8.com/{estilo}/{tamaño}/{nombre-icono}.png

Ejemplos:
- https://img.icons8.com/fluency/96/task.png
- https://img.icons8.com/color/96/edit--v1.png
```

## Personalización Avanzada

### Agregar Nuevos Iconos

Para agregar más iconos a la galería, editar el array `ICONOS_DISPONIBLES` en `EmailIconsManagement.tsx`:

```typescript
const ICONOS_DISPONIBLES: IconOption[] = [
  // ... iconos existentes ...
  {
    url: 'https://img.icons8.com/fluency/96/nuevo-icono.png',
    nombre: 'Nuevo Icono Descriptivo',
    categoria: 'Categoría Existente o Nueva'
  },
];
```

### Agregar Nuevas Categorías

Las categorías se generan automáticamente del array `ICONOS_DISPONIBLES`:

```typescript
const categorias = ['Todas', ...Array.from(new Set(ICONOS_DISPONIBLES.map(i => i.categoria)))];
```

### Agregar Nuevos Tipos de Notificación

1. **Agregar a la migración** (`add_email_icons_configuration.sql`):
```sql
INSERT INTO email_icons_config (tipo_notificacion, icono_url, icono_nombre)
VALUES ('nuevo_tipo', 'url_del_icono', 'Nombre del Icono');
```

2. **Agregar al componente** (`EmailIconsManagement.tsx`):
```typescript
const TIPOS_NOTIFICACION = [
  // ... tipos existentes ...
  {
    key: 'nuevo_tipo',
    label: 'Nuevo Tipo',
    icon: IconoLucide,
    color: 'text-blue-600'
  },
];
```

3. **Actualizar la edge function** (TypeScript interface):
```typescript
interface EmailNotification {
  tipo: 'nueva_tarea' | 'nuevo_comentario' | ... | 'nuevo_tipo';
  // ... otros campos
}
```

## Pruebas

### Probar Cambio de Icono

1. Ir a Admin Panel → Iconos de Email
2. Cambiar el icono de "Nueva Tarea" a uno diferente
3. Crear una nueva tarea asignada a un usuario
4. Verificar que el email recibido contiene el nuevo icono

### Probar Restauración

1. Cambiar varios iconos
2. Hacer clic en "Restaurar por Defecto"
3. Verificar que todos vuelven a la configuración inicial
4. Crear una tarea y verificar que el email usa el icono por defecto

### Probar Fallback

1. En la base de datos, eliminar temporalmente una configuración:
```sql
DELETE FROM email_icons_config WHERE tipo_notificacion = 'nueva_tarea';
```
2. Crear una nueva tarea
3. Verificar que el email usa el icono por defecto (fallback)
4. Restaurar la configuración desde el Admin Panel

## Troubleshooting

### Los iconos no se cargan en el email

**Problema:** El email muestra un icono roto

**Soluciones:**
1. Verificar que la URL del icono es válida y pública
2. Probar la URL directamente en el navegador
3. Verificar que no hay firewall bloqueando Icons8
4. Usar `onError` handler en el componente para debugging

### Los cambios no se aplican

**Problema:** El email sigue usando el icono anterior

**Soluciones:**
1. Verificar que la edge function está desplegada:
```bash
# Redesplegar edge function
supabase functions deploy send-task-notification-email
```
2. Verificar logs de la edge function en Supabase Dashboard
3. Limpiar caché del navegador

### Error al guardar configuración

**Problema:** Error al actualizar icono en el Admin Panel

**Soluciones:**
1. Verificar políticas RLS en `email_icons_config`
2. Verificar que el usuario tiene permisos de super_admin
3. Revisar console del navegador para errores JavaScript
4. Verificar conexión a Supabase

## Seguridad

### Permisos

- Solo usuarios con rol `super_admin` pueden acceder al componente
- Las políticas RLS garantizan que solo anon puede modificar
- Los emails se envían con `SERVICE_ROLE_KEY` para acceso completo

### Validación

- URLs de iconos validadas en el frontend
- Fallback a iconos por defecto si hay error
- `onError` handler en tags `<img>` del email
- Logs de errores en la edge function

## Mantenimiento

### Actualizar Iconos de Icons8

Si Icons8 cambia URLs o depreca iconos:

1. Buscar nuevas URLs en https://icons8.com
2. Actualizar array `ICONOS_DISPONIBLES`
3. Actualizar valores por defecto en la función `resetToDefaults()`
4. Actualizar valores por defecto en la edge function

### Monitoreo

Verificar regularmente:
- Logs de la edge function para errores de iconos
- Tabla `email_logs` para emails fallidos
- URLs de iconos para asegurar que siguen funcionando

## Recursos Adicionales

- **Icons8**: https://icons8.com
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security

## Resumen

El sistema de gestión de iconos de email proporciona:

✅ **60+ iconos** organizados por categorías
✅ **6 tipos de notificación** configurables
✅ **Interfaz intuitiva** con vista previa en tiempo real
✅ **Fallback automático** a valores por defecto
✅ **Seguridad** con RLS y permisos de super_admin
✅ **Fácil mantenimiento** y extensibilidad

El sistema está completamente integrado y listo para usar.
