# Prueba de Filtros por Usuario

## Objetivo
Verificar que todos los filtros en la grilla de tareas siempre muestren solo las tareas relacionadas con el usuario logueado.

## Cambios Implementados

### 1. Función `applyFilters()` Mejorada

**Antes:**
- Los filtros aplicaban sobre todas las tareas sin considerar el usuario actual
- El filtro "asignada_a" comparaba incorrectamente el array completo con un string
- No había garantía de que el usuario actual estuviera relacionado con las tareas mostradas

**Después:**
- SIEMPRE se filtra primero por el usuario actual (asignado o creador)
- El filtro "asignada_a" ahora verifica correctamente si el array incluye al usuario seleccionado
- Todos los filtros adicionales se aplican DESPUÉS del filtro de usuario

### 2. Lógica de Filtrado

```typescript
const applyFilters = () => {
  // 1. SIEMPRE comenzar con tareas relacionadas al usuario actual
  let filtered = [...tareas].filter((tarea) => {
    const isAssignedTo = tarea.asignada_a && tarea.asignada_a.includes(currentUser);
    const isCreatedBy = tarea.creada_por === currentUser;
    return isAssignedTo || isCreatedBy;
  });

  // 2. Aplicar filtros adicionales sobre las tareas del usuario
  if (filters.id) { /* filtrar por ID */ }
  if (filters.nombre_tarea) { /* filtrar por nombre */ }
  if (filters.asignada_a) {
    // Corregido: verificar si el array incluye al usuario seleccionado
    filtered = filtered.filter(t =>
      Array.isArray(t.asignada_a) && t.asignada_a.includes(filters.asignada_a)
    );
  }
  // ... resto de filtros
};
```

## Pruebas a Realizar

### Prueba 1: Filtro de Estado (Pendiente)

**Usuario:** Maxi

1. Inicia sesión como Maxi
2. Ve a la sección "Tareas"
3. En el filtro "Estado", selecciona **"pendiente"**
4. **Resultado esperado:**
   - ✅ Solo se muestran tareas con estado "pendiente"
   - ✅ TODAS las tareas mostradas están asignadas a Maxi O fueron creadas por Maxi
   - ✅ NO se muestran tareas de otros usuarios donde Maxi no esté involucrado

### Prueba 2: Filtro de Proyecto

**Usuario:** Romina

1. Inicia sesión como Romina
2. Ve a la sección "Tareas"
3. En el filtro "Proyecto", selecciona **"Copa bplay"**
4. **Resultado esperado:**
   - ✅ Solo se muestran tareas del proyecto "Copa bplay"
   - ✅ TODAS las tareas mostradas están asignadas a Romina O fueron creadas por Romina
   - ✅ NO se muestran tareas del proyecto donde Romina no esté involucrada

### Prueba 3: Filtro de Asignado A

**Usuario:** Juano

1. Inicia sesión como Juano
2. Ve a la sección "Tareas"
3. En el filtro "Asignada a", selecciona **"Maxi"**
4. **Resultado esperado:**
   - ✅ Solo se muestran tareas donde Maxi está asignado
   - ✅ TODAS las tareas mostradas tienen a Juano como asignado O creador
   - ✅ Es decir, se muestran tareas donde TANTO Juano como Maxi están involucrados

### Prueba 4: Filtro de Nombre de Tarea

**Usuario:** Maxi

1. Inicia sesión como Maxi
2. Ve a la sección "Tareas"
3. En el filtro "Nombre de tarea", escribe **"Video"**
4. **Resultado esperado:**
   - ✅ Solo se muestran tareas cuyo nombre contiene "Video"
   - ✅ TODAS las tareas mostradas están relacionadas con Maxi
   - ✅ NO se muestran tareas de otros usuarios aunque contengan "Video"

### Prueba 5: Filtros Combinados

**Usuario:** Romina

1. Inicia sesión como Romina
2. Ve a la sección "Tareas"
3. Aplica los siguientes filtros:
   - Estado: **"pendiente"**
   - Proyecto: **"La Lupa de Tobi"**
   - Asignada a: **"Romina"**
4. **Resultado esperado:**
   - ✅ Solo se muestran tareas que cumplan TODOS los criterios:
     - Estado = pendiente
     - Proyecto = La Lupa de Tobi
     - Romina está asignada
     - Romina está relacionada (asignada O creadora)

### Prueba 6: Sin Filtros (Ver Todas)

**Usuario:** Juano

1. Inicia sesión como Juano
2. Ve a la sección "Tareas"
3. Asegúrate de que NO hay ningún filtro aplicado (todos en blanco/default)
4. **Resultado esperado:**
   - ✅ Se muestran TODAS las tareas relacionadas con Juano
   - ✅ Incluye tareas donde Juano está asignado
   - ✅ Incluye tareas creadas por Juano
   - ✅ NO se muestran tareas donde Juano no esté involucrado

## Casos de Uso Específicos

### Caso 1: Tarea creada por Maxi, asignada a Romina y Juano

**Cuando Maxi busca:**
- ✅ Ve la tarea (porque la creó)
- ✅ Puede filtrarla por cualquier criterio

**Cuando Romina busca:**
- ✅ Ve la tarea (porque está asignada)
- ✅ Puede filtrarla por cualquier criterio

**Cuando Juano busca:**
- ✅ Ve la tarea (porque está asignado)
- ✅ Puede filtrarla por cualquier criterio

**Cuando Tobi busca (si no está asignado):**
- ❌ NO ve la tarea (no está relacionado)

### Caso 2: Filtro "Asignada a: Maxi" cuando Romina está logueada

**Tareas en el sistema:**
1. Tarea A: Creada por Maxi, Asignada a Maxi
2. Tarea B: Creada por Romina, Asignada a Maxi
3. Tarea C: Creada por Maxi, Asignada a Maxi y Romina
4. Tarea D: Creada por Tobi, Asignada a Maxi y Tobi

**Resultado cuando Romina filtra por "Asignada a: Maxi":**
- ❌ NO ve Tarea A (Maxi asignado pero Romina no relacionada)
- ✅ SÍ ve Tarea B (Maxi asignado Y Romina creadora)
- ✅ SÍ ve Tarea C (Maxi asignado Y Romina asignada)
- ❌ NO ve Tarea D (Maxi asignado pero Romina no relacionada)

## Verificación Técnica

### En la Consola del Navegador (F12)

Puedes verificar el filtrado observando:

```javascript
// Las tareas cargadas siempre pertenecen al usuario
console.log('Tareas del usuario:', tareas);

// Cada tarea debe cumplir:
tareas.forEach(tarea => {
  const perteneceAlUsuario =
    tarea.asignada_a.includes(currentUser) ||
    tarea.creada_por === currentUser;
  console.log(`Tarea ${tarea.id}: ${perteneceAlUsuario ? '✅' : '❌'}`);
});
```

## Resultado Final

✅ **Sistema funcionando correctamente si:**
- Todos los filtros SIEMPRE muestran solo tareas del usuario actual
- No se pueden ver tareas de otros usuarios donde el usuario actual no esté involucrado
- Los filtros se aplican correctamente sobre las tareas del usuario
- La combinación de filtros funciona como se espera

## Notas Importantes

1. **Privacidad de Datos:** Los usuarios solo ven sus propias tareas
2. **Filtro Base Automático:** El filtro por usuario actual es transparente e invisible
3. **Corrección del Bug:** El filtro "asignada_a" ahora funciona correctamente con arrays
4. **Rendimiento:** El filtrado ocurre en el frontend sobre datos ya filtrados desde el backend
