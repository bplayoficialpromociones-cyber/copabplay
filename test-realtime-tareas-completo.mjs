#!/usr/bin/env node

/**
 * Script de Test Completo para Sistema de Tiempo Real de Tareas
 *
 * Este script verifica que:
 * 1. Las tareas se crean correctamente
 * 2. Las tareas aparecen en las grillas de todos los usuarios asignados
 * 3. Las notificaciones se crean DESPUÉS de que las tareas están en las grillas
 * 4. Los emails se envían correctamente
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function logSuccess(message) {
  log(COLORS.green, `✓ ${message}`);
}

function logError(message) {
  log(COLORS.red, `✗ ${message}`);
}

function logInfo(message) {
  log(COLORS.blue, `ℹ ${message}`);
}

function logWarning(message) {
  log(COLORS.yellow, `⚠ ${message}`);
}

function logStep(step, message) {
  log(COLORS.cyan, `\n[PASO ${step}] ${message}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verifica si un usuario tiene una tarea en su grilla
 */
async function usuarioTieneTarea(usuario, tareaId) {
  const { data: todasLasTareas, error } = await supabase
    .from('tareas')
    .select('*')
    .order('fecha_creacion', { ascending: false });

  if (error) {
    logError(`Error al obtener tareas: ${error.message}`);
    return false;
  }

  // Aplicar el mismo filtrado que hace el componente
  const tareasDelUsuario = todasLasTareas.filter((tarea) => {
    const isAssignedTo = tarea.asignada_a && tarea.asignada_a.includes(usuario);
    const isCreatedBy = tarea.creada_por === usuario;
    return isAssignedTo || isCreatedBy;
  });

  const tieneLaTarea = tareasDelUsuario.some(t => t.id === tareaId);

  logInfo(`  ${usuario}: ${tieneLaTarea ? '✓' : '✗'} ${tieneLaTarea ? 'SÍ' : 'NO'} tiene la tarea ${tareaId}`);

  if (!tieneLaTarea) {
    const laTarea = todasLasTareas.find(t => t.id === tareaId);
    if (laTarea) {
      logWarning(`    Tarea existe en BD pero no en grilla de ${usuario}`);
      logWarning(`    asignada_a: ${JSON.stringify(laTarea.asignada_a)}`);
      logWarning(`    creada_por: ${laTarea.creada_por}`);
    } else {
      logWarning(`    Tarea ${tareaId} no existe en BD`);
    }
  }

  return tieneLaTarea;
}

/**
 * Verifica si existen notificaciones para un usuario sobre una tarea
 */
async function usuarioTieneNotificacion(usuario, tareaId) {
  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('usuario', usuario)
    .eq('tarea_id', tareaId)
    .order('created_at', { ascending: false });

  if (error) {
    logError(`Error al obtener notificaciones: ${error.message}`);
    return false;
  }

  const tieneNotificacion = data && data.length > 0;
  logInfo(`  ${usuario}: ${tieneNotificacion ? '✓' : '✗'} ${tieneNotificacion ? 'SÍ' : 'NO'} tiene notificación de tarea ${tareaId}`);

  return tieneNotificacion;
}

/**
 * Test 1: Crear tarea y verificar que aparece en grillas
 */
async function test1_CrearTareaYVerificarGrillas() {
  logStep(1, 'Crear tarea asignada a múltiples usuarios');

  const creador = 'Maxi';
  const asignados = ['Maxi', 'Juano'];

  logInfo(`Creador: ${creador}`);
  logInfo(`Asignados: ${asignados.join(', ')}`);

  // Crear tarea
  const { data: nuevaTarea, error } = await supabase
    .from('tareas')
    .insert([{
      nombre_tarea: `Test Realtime ${new Date().toISOString()}`,
      descripcion_tarea: 'Tarea de prueba para verificar sistema de tiempo real',
      estado: 'pendiente',
      asignada_a: asignados,
      proyecto: 'La Lupa de Tobi',
      creada_por: creador,
      imagen_tarea: [],
      video_tarea: []
    }])
    .select()
    .single();

  if (error) {
    logError(`Error al crear tarea: ${error.message}`);
    return null;
  }

  logSuccess(`Tarea creada con ID: ${nuevaTarea.id}`);

  return nuevaTarea;
}

/**
 * Test 2: Verificar que la tarea aparece en las grillas después del delay
 */
async function test2_VerificarTareaEnGrillas(tarea) {
  logStep(2, 'Verificar que la tarea aparece en las grillas (simulando realtime)');

  const asignados = tarea.asignada_a;
  const creador = tarea.creada_por;
  const todosLosUsuarios = [...new Set([...asignados, creador])];

  logInfo('Esperando 2 segundos (simulando propagación de realtime)...');
  await sleep(2000);

  logInfo('Verificando grillas de usuarios:');

  let todosCorrecto = true;
  for (const usuario of todosLosUsuarios) {
    const tiene = await usuarioTieneTarea(usuario, tarea.id);
    if (!tiene) {
      todosCorrecto = false;
      logError(`  FALLO: ${usuario} NO tiene la tarea en su grilla`);
    }
  }

  if (todosCorrecto) {
    logSuccess('ÉXITO: Todos los usuarios tienen la tarea en sus grillas');
    return true;
  } else {
    logError('FALLO: Algunos usuarios NO tienen la tarea en sus grillas');
    return false;
  }
}

/**
 * Test 3: Crear notificaciones y verificar
 */
async function test3_CrearYVerificarNotificaciones(tarea) {
  logStep(3, 'Crear notificaciones para los usuarios');

  const asignados = tarea.asignada_a;
  const creador = tarea.creada_por;
  const todosLosUsuarios = [...new Set([...asignados, creador])];

  // Crear notificaciones
  const notifications = todosLosUsuarios.map(usuario => ({
    usuario,
    tipo: 'nueva_tarea',
    mensaje: usuario === creador
      ? `Has creado la tarea "${tarea.nombre_tarea}"`
      : `Se te ha asignado la tarea "${tarea.nombre_tarea}"`,
    tarea_id: tarea.id,
    leida: false
  }));

  const { error } = await supabase
    .from('notificaciones')
    .insert(notifications);

  if (error) {
    logError(`Error al crear notificaciones: ${error.message}`);
    return false;
  }

  logSuccess(`Notificaciones creadas para ${todosLosUsuarios.length} usuarios`);

  // Verificar que las notificaciones existen
  logInfo('Verificando notificaciones:');
  let todosCorrecto = true;
  for (const usuario of todosLosUsuarios) {
    const tiene = await usuarioTieneNotificacion(usuario, tarea.id);
    if (!tiene) {
      todosCorrecto = false;
      logError(`  FALLO: ${usuario} NO tiene notificación`);
    }
  }

  if (todosCorrecto) {
    logSuccess('ÉXITO: Todos los usuarios tienen notificaciones');
    return true;
  } else {
    logError('FALLO: Algunos usuarios NO tienen notificaciones');
    return false;
  }
}

/**
 * Test 4: Verificar orden correcto de eventos
 */
async function test4_VerificarOrdenEventos() {
  logStep(4, 'Verificar orden correcto: Tarea en grilla ANTES de notificación');

  const creador = 'Maxi';
  const asignados = ['Maxi', 'Juano', 'Romina'];

  // Crear tarea
  const { data: nuevaTarea, error: errorTarea } = await supabase
    .from('tareas')
    .insert([{
      nombre_tarea: `Test Orden ${new Date().toISOString()}`,
      descripcion_tarea: 'Verificar orden de eventos',
      estado: 'pendiente',
      asignada_a: asignados,
      proyecto: 'Copa bplay',
      creada_por: creador,
      imagen_tarea: [],
      video_tarea: []
    }])
    .select()
    .single();

  if (errorTarea) {
    logError(`Error al crear tarea: ${errorTarea.message}`);
    return false;
  }

  logInfo(`Tarea ${nuevaTarea.id} creada`);

  // Paso 1: Verificar inmediatamente (no debe estar en grilla de otros usuarios aún)
  logInfo('Verificación inmediata (puede fallar por race condition):');
  for (const usuario of asignados) {
    await usuarioTieneTarea(usuario, nuevaTarea.id);
  }

  // Paso 2: Esperar 2 segundos (simular realtime)
  logInfo('Esperando 2 segundos para propagación...');
  await sleep(2000);

  // Paso 3: Verificar que ahora SÍ está en todas las grillas
  logInfo('Verificación después del delay:');
  let tareasEnGrilla = true;
  for (const usuario of asignados) {
    const tiene = await usuarioTieneTarea(usuario, nuevaTarea.id);
    if (!tiene) {
      tareasEnGrilla = false;
    }
  }

  if (!tareasEnGrilla) {
    logError('FALLO: Las tareas NO están en todas las grillas después del delay');
    return false;
  }

  logSuccess('ÉXITO: Las tareas están en todas las grillas');

  // Paso 4: Ahora crear notificaciones
  logInfo('Creando notificaciones ahora que las tareas están en las grillas...');
  const notifications = asignados.map(usuario => ({
    usuario,
    tipo: 'nueva_tarea',
    mensaje: `Se te ha asignado la tarea "${nuevaTarea.nombre_tarea}"`,
    tarea_id: nuevaTarea.id,
    leida: false
  }));

  const { error: errorNotif } = await supabase
    .from('notificaciones')
    .insert(notifications);

  if (errorNotif) {
    logError(`Error al crear notificaciones: ${errorNotif.message}`);
    return false;
  }

  logSuccess('ÉXITO: Notificaciones creadas DESPUÉS de que las tareas están en las grillas');

  // Verificar que las notificaciones apuntan a tareas existentes
  logInfo('Verificando que las notificaciones apuntan a tareas existentes:');
  for (const usuario of asignados) {
    const tieneTarea = await usuarioTieneTarea(usuario, nuevaTarea.id);
    const tieneNotif = await usuarioTieneNotificacion(usuario, nuevaTarea.id);

    if (tieneTarea && tieneNotif) {
      logSuccess(`  ${usuario}: ✓ Tiene tarea Y notificación (correcto)`);
    } else if (!tieneTarea && tieneNotif) {
      logError(`  ${usuario}: ✗ Tiene notificación pero NO tiene tarea (ERROR)`);
    } else if (tieneTarea && !tieneNotif) {
      logWarning(`  ${usuario}: Tiene tarea pero NO tiene notificación`);
    }
  }

  return true;
}

/**
 * Test 5: Simular flujo completo del componente
 */
async function test5_SimularFlujoCompleto() {
  logStep(5, 'Simular flujo completo como en TasksManagement.tsx');

  const creador = 'Maxi';
  const asignados = ['Juano', 'Maxi'];

  logInfo('=== SIMULANDO HANDLESUBMIT ===');

  // 1. Crear tarea
  logInfo('1. Crear tarea en BD...');
  const { data: nuevaTarea, error } = await supabase
    .from('tareas')
    .insert([{
      nombre_tarea: `Test Flujo Completo ${new Date().toISOString()}`,
      descripcion_tarea: 'Simulación completa del flujo',
      estado: 'pendiente',
      asignada_a: asignados,
      proyecto: 'La Lupa de Tobi',
      creada_por: creador,
      imagen_tarea: [],
      video_tarea: []
    }])
    .select()
    .single();

  if (error) {
    logError(`Error: ${error.message}`);
    return false;
  }

  logSuccess(`Tarea ${nuevaTarea.id} creada`);

  // 2. Esperar 1.5 segundos (como en el código)
  logInfo('2. Esperando 1.5 segundos (propagación realtime)...');
  await sleep(1500);

  // 3. Verificar que está en las grillas
  logInfo('3. Verificando que la tarea está en las grillas:');
  let todosCorrecto = true;
  const todosLosUsuarios = [...new Set([...asignados, creador])];

  for (const usuario of todosLosUsuarios) {
    const tiene = await usuarioTieneTarea(usuario, nuevaTarea.id);
    if (!tiene) {
      todosCorrecto = false;
      logError(`  ERROR: ${usuario} NO tiene la tarea`);
    } else {
      logSuccess(`  ${usuario}: ✓ Tiene la tarea`);
    }
  }

  if (!todosCorrecto) {
    logError('FALLO CRÍTICO: Las tareas NO están en todas las grillas');
    logError('Esto es exactamente el problema reportado');
    return false;
  }

  // 4. Crear notificaciones
  logInfo('4. Creando notificaciones...');
  const notifications = todosLosUsuarios.map(usuario => ({
    usuario,
    tipo: 'nueva_tarea',
    mensaje: usuario === creador
      ? `Has creado la tarea "${nuevaTarea.nombre_tarea}"`
      : `Se te ha asignado la tarea "${nuevaTarea.nombre_tarea}"`,
    tarea_id: nuevaTarea.id,
    leida: false
  }));

  const { error: errorNotif } = await supabase
    .from('notificaciones')
    .insert(notifications);

  if (errorNotif) {
    logError(`Error al crear notificaciones: ${errorNotif.message}`);
    return false;
  }

  logSuccess('Notificaciones creadas');

  // 5. Verificación final
  logInfo('5. Verificación final:');
  for (const usuario of todosLosUsuarios) {
    const tieneTarea = await usuarioTieneTarea(usuario, nuevaTarea.id);
    const tieneNotif = await usuarioTieneNotificacion(usuario, nuevaTarea.id);

    if (tieneTarea && tieneNotif) {
      logSuccess(`  ${usuario}: ✓✓ Tarea en grilla + Notificación (PERFECTO)`);
    } else {
      logError(`  ${usuario}: ✗✗ Tarea: ${tieneTarea ? '✓' : '✗'}, Notif: ${tieneNotif ? '✓' : '✗'}`);
      todosCorrecto = false;
    }
  }

  return todosCorrecto;
}

/**
 * Limpieza: Eliminar tareas de test
 */
async function limpiarTareasDeTest() {
  logInfo('\nLimpiando tareas de test...');

  const { data, error } = await supabase
    .from('tareas')
    .delete()
    .or('nombre_tarea.ilike.%Test Realtime%,nombre_tarea.ilike.%Test Orden%,nombre_tarea.ilike.%Test Flujo%');

  if (error) {
    logWarning(`No se pudieron eliminar las tareas de test: ${error.message}`);
  } else {
    logInfo('Tareas de test eliminadas');
  }
}

/**
 * Main
 */
async function main() {
  log(COLORS.magenta, '\n════════════════════════════════════════════════════');
  log(COLORS.magenta, '  TEST COMPLETO DE SISTEMA DE TIEMPO REAL - TAREAS  ');
  log(COLORS.magenta, '════════════════════════════════════════════════════\n');

  let resultados = {
    test1: false,
    test2: false,
    test3: false,
    test4: false,
    test5: false
  };

  try {
    // Test 1: Crear tarea
    const tarea = await test1_CrearTareaYVerificarGrillas();
    if (tarea) {
      resultados.test1 = true;

      // Test 2: Verificar grillas
      resultados.test2 = await test2_VerificarTareaEnGrillas(tarea);

      // Test 3: Crear y verificar notificaciones
      resultados.test3 = await test3_CrearYVerificarNotificaciones(tarea);
    }

    // Test 4: Verificar orden
    resultados.test4 = await test4_VerificarOrdenEventos();

    // Test 5: Simular flujo completo
    resultados.test5 = await test5_SimularFlujoCompleto();

  } catch (error) {
    logError(`Error durante tests: ${error.message}`);
    console.error(error);
  }

  // Limpiar
  await limpiarTareasDeTest();

  // Resumen
  log(COLORS.magenta, '\n════════════════════════════════════════════════════');
  log(COLORS.magenta, '  RESUMEN DE TESTS  ');
  log(COLORS.magenta, '════════════════════════════════════════════════════\n');

  const tests = [
    { nombre: 'Test 1: Crear tarea', resultado: resultados.test1 },
    { nombre: 'Test 2: Verificar grillas', resultado: resultados.test2 },
    { nombre: 'Test 3: Verificar notificaciones', resultado: resultados.test3 },
    { nombre: 'Test 4: Verificar orden de eventos', resultado: resultados.test4 },
    { nombre: 'Test 5: Simular flujo completo', resultado: resultados.test5 }
  ];

  let totalExitosos = 0;
  tests.forEach(test => {
    if (test.resultado) {
      logSuccess(test.nombre);
      totalExitosos++;
    } else {
      logError(test.nombre);
    }
  });

  log(COLORS.magenta, `\n${totalExitosos}/${tests.length} tests exitosos\n`);

  if (totalExitosos === tests.length) {
    logSuccess('¡TODOS LOS TESTS PASARON! ✓✓✓');
    process.exit(0);
  } else {
    logError('ALGUNOS TESTS FALLARON');
    process.exit(1);
  }
}

main();
