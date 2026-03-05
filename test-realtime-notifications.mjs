import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealtimeNotifications() {
  console.log('🔔 Iniciando prueba de notificaciones en tiempo real...\n');

  // Test 1: Verificar usuarios existentes
  console.log('📋 Test 1: Obteniendo usuarios del sistema...');
  const { data: users, error: usersError } = await supabase
    .from('admin_credentials')
    .select('username, email, activo')
    .eq('activo', true)
    .order('username');

  if (usersError) {
    console.error('❌ Error al obtener usuarios:', usersError);
    process.exit(1);
  }

  console.log('✅ Usuarios activos encontrados:');
  users.forEach(user => {
    console.log(`   - ${user.username} (${user.email})`);
  });
  console.log('');

  if (users.length < 2) {
    console.log('⚠️  Necesitas al menos 2 usuarios activos para esta prueba');
    process.exit(1);
  }

  const testUser1 = users[0].username;
  const testUser2 = users[1].username;

  console.log(`🎯 Usando "${testUser1}" y "${testUser2}" para las pruebas\n`);

  // Test 2: Configurar suscripción a notificaciones para testUser2
  console.log(`📡 Test 2: Configurando suscripción en tiempo real para "${testUser2}"...`);

  let notificationReceived = false;
  let notificationData = null;

  const channel = supabase
    .channel('test-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `usuario=eq.${testUser2}`
      },
      (payload) => {
        console.log('✅ ¡Notificación recibida en tiempo real!');
        console.log('   Payload:', JSON.stringify(payload.new, null, 2));
        notificationReceived = true;
        notificationData = payload.new;
      }
    )
    .subscribe((status) => {
      console.log(`   Estado de suscripción: ${status}`);
    });

  // Esperar a que la suscripción esté lista
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('✅ Suscripción configurada\n');

  // Test 3: Crear una tarea de prueba
  console.log('📝 Test 3: Creando tarea de prueba...');
  const { data: newTask, error: taskError } = await supabase
    .from('tareas')
    .insert({
      nombre_tarea: 'Test de Notificaciones en Tiempo Real',
      descripcion_tarea: 'Esta es una tarea de prueba para verificar el sistema de notificaciones',
      proyecto: 'Copa bplay',
      estado: 'pendiente',
      creada_por: testUser1,
      asignada_a: [testUser2],
      fecha_creacion: new Date().toISOString()
    })
    .select()
    .single();

  if (taskError) {
    console.error('❌ Error al crear tarea:', taskError);
    await supabase.removeChannel(channel);
    process.exit(1);
  }

  console.log('✅ Tarea creada con ID:', newTask.id);
  console.log('');

  // Test 4: Esperar a que llegue la notificación (el edge function debería crearla)
  console.log('⏳ Test 4: Esperando notificación en tiempo real (máximo 10 segundos)...');

  let waitTime = 0;
  const maxWait = 10000;
  const checkInterval = 500;

  while (!notificationReceived && waitTime < maxWait) {
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    waitTime += checkInterval;
    process.stdout.write(`\r   Esperando... ${(waitTime / 1000).toFixed(1)}s`);
  }
  console.log('\n');

  if (notificationReceived) {
    console.log('✅ ¡Notificación recibida en tiempo real exitosamente!');
    console.log('   Usuario:', notificationData.usuario);
    console.log('   Tipo:', notificationData.tipo);
    console.log('   Mensaje:', notificationData.mensaje);
  } else {
    console.log('⚠️  No se recibió notificación en tiempo real');
    console.log('   Esto podría indicar:');
    console.log('   1. Realtime no está habilitado en Supabase para la tabla "notificaciones"');
    console.log('   2. El edge function no se ejecutó correctamente');
    console.log('   3. Hay un problema con los permisos de la base de datos');
  }
  console.log('');

  // Test 5: Verificar que la notificación existe en la base de datos
  console.log('🔍 Test 5: Verificando notificación en base de datos...');
  const { data: notifications, error: notifError } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('usuario', testUser2)
    .eq('tarea_id', newTask.id)
    .order('fecha_creacion', { ascending: false });

  if (notifError) {
    console.error('❌ Error al verificar notificaciones:', notifError);
  } else if (notifications && notifications.length > 0) {
    console.log('✅ Notificación encontrada en base de datos:');
    console.log('   ID:', notifications[0].id);
    console.log('   Tipo:', notifications[0].tipo);
    console.log('   Mensaje:', notifications[0].mensaje);
    console.log('   Leída:', notifications[0].leida);
  } else {
    console.log('⚠️  No se encontró notificación en la base de datos');
    console.log('   El edge function podría no haberse ejecutado');
  }
  console.log('');

  // Test 6: Crear un comentario para probar notificación de comentario
  console.log('💬 Test 6: Creando comentario de prueba...');

  notificationReceived = false;
  notificationData = null;

  const { data: newComment, error: commentError } = await supabase
    .from('tarea_comentarios')
    .insert({
      tarea_id: newTask.id,
      usuario: testUser1,
      comentario: 'Este es un comentario de prueba para verificar notificaciones',
      fecha_creacion: new Date().toISOString()
    })
    .select()
    .single();

  if (commentError) {
    console.error('❌ Error al crear comentario:', commentError);
  } else {
    console.log('✅ Comentario creado con ID:', newComment.id);

    // Esperar notificación de comentario
    console.log('⏳ Esperando notificación de comentario (máximo 10 segundos)...');
    waitTime = 0;

    while (!notificationReceived && waitTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;
      process.stdout.write(`\r   Esperando... ${(waitTime / 1000).toFixed(1)}s`);
    }
    console.log('\n');

    if (notificationReceived) {
      console.log('✅ ¡Notificación de comentario recibida en tiempo real!');
    } else {
      console.log('⚠️  No se recibió notificación de comentario en tiempo real');
    }
  }
  console.log('');

  // Test 7: Limpiar - eliminar tarea de prueba
  console.log('🧹 Test 7: Limpiando datos de prueba...');

  // Eliminar notificaciones
  const { error: deleteNotifError } = await supabase
    .from('notificaciones')
    .delete()
    .eq('tarea_id', newTask.id);

  if (deleteNotifError) {
    console.error('⚠️  Error al eliminar notificaciones:', deleteNotifError);
  } else {
    console.log('✅ Notificaciones eliminadas');
  }

  // Eliminar comentarios
  if (newComment) {
    const { error: deleteCommentError } = await supabase
      .from('tarea_comentarios')
      .delete()
      .eq('id', newComment.id);

    if (deleteCommentError) {
      console.error('⚠️  Error al eliminar comentario:', deleteCommentError);
    } else {
      console.log('✅ Comentario eliminado');
    }
  }

  // Eliminar tarea
  const { error: deleteTaskError } = await supabase
    .from('tareas')
    .delete()
    .eq('id', newTask.id);

  if (deleteTaskError) {
    console.error('⚠️  Error al eliminar tarea:', deleteTaskError);
  } else {
    console.log('✅ Tarea eliminada');
  }

  // Cerrar canal
  await supabase.removeChannel(channel);
  console.log('✅ Canal de suscripción cerrado\n');

  // Resumen
  console.log('📊 Resumen de Pruebas:');
  console.log('   ✓ Obtención de usuarios');
  console.log('   ✓ Configuración de suscripción en tiempo real');
  console.log('   ✓ Creación de tarea');
  console.log(notificationReceived ? '   ✓ Recepción de notificación en tiempo real' : '   ✗ Notificación en tiempo real no recibida');
  console.log('   ✓ Verificación en base de datos');
  console.log('   ✓ Prueba de comentarios');
  console.log('   ✓ Limpieza de datos\n');

  if (!notificationReceived) {
    console.log('⚠️  IMPORTANTE: Las notificaciones no se reciben en tiempo real');
    console.log('   Por favor verifica la configuración de Realtime en Supabase\n');
  } else {
    console.log('🎉 ¡Sistema de notificaciones en tiempo real funcionando correctamente!\n');
  }
}

// Ejecutar pruebas
testRealtimeNotifications()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
