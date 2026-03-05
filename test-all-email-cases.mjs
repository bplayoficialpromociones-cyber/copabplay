import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n=======================================================');
console.log('PRUEBA COMPLETA DE TODOS LOS CASOS DE USO DE EMAILS');
console.log('=======================================================\n');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function para enviar email
async function sendTestEmail(tipo, mensaje, tareaId = 999, tareaNombre = 'Tarea de Prueba') {
  const payload = {
    usuario: 'Max',
    tipo: tipo,
    mensaje: mensaje,
    tarea_id: tareaId,
    tarea_nombre: tareaNombre,
    proyecto: 'Copa bplay',
    url_tarea: 'https://copabplay.com.ar/admin/tareas'
  };

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-task-notification-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();
    return { success: response.ok, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// CASO 1: Creación de Tarea
console.log('📋 CASO 1: CREACIÓN DE TAREA');
console.log('─────────────────────────────────────────────────────');
let result = await sendTestEmail(
  'nueva_tarea',
  'Se te ha asignado la tarea "Implementar nueva funcionalidad"',
  1001,
  'Implementar nueva funcionalidad'
);
if (result.success) {
  console.log('✅ Email enviado correctamente');
  console.log('   Destinatario: Max (max@copabplay.com.ar)');
  console.log('   Asunto: 🎯 Nueva tarea asignada');
} else {
  console.log('❌ Error:', result.error || result.result);
}
await sleep(1000);

// CASO 2: Modificación de Tarea
console.log('\n📝 CASO 2: MODIFICACIÓN DE TAREA');
console.log('─────────────────────────────────────────────────────');
result = await sendTestEmail(
  'tarea_modificada',
  'La tarea "Implementar nueva funcionalidad" ha sido modificada',
  1001,
  'Implementar nueva funcionalidad'
);
if (result.success) {
  console.log('✅ Email enviado correctamente');
  console.log('   Destinatario: Max (max@copabplay.com.ar)');
  console.log('   Asunto: 📝 Tarea modificada');
} else {
  console.log('❌ Error:', result.error || result.result);
}
await sleep(1000);

// CASO 3: Eliminación de Tarea
console.log('\n🗑️  CASO 3: ELIMINACIÓN DE TAREA');
console.log('─────────────────────────────────────────────────────');
result = await sendTestEmail(
  'tarea_modificada',
  'Alexis eliminó la tarea "Implementar nueva funcionalidad"',
  1001,
  'Implementar nueva funcionalidad'
);
if (result.success) {
  console.log('✅ Email enviado correctamente');
  console.log('   Destinatario: Max (max@copabplay.com.ar)');
  console.log('   Asunto: 📝 Tarea modificada (eliminada)');
} else {
  console.log('❌ Error:', result.error || result.result);
}
await sleep(1000);

// CASO 4: Creación de Comentario
console.log('\n💬 CASO 4: CREACIÓN DE COMENTARIO');
console.log('─────────────────────────────────────────────────────');
const payloadComentario = {
  usuario: 'Max',
  tipo: 'nuevo_comentario',
  mensaje: 'Tobias agregó un comentario en una tarea asignada a ti',
  tarea_id: 1001,
  tarea_nombre: 'Implementar nueva funcionalidad',
  proyecto: 'Copa bplay',
  comentario_texto: 'Este es un comentario de prueba para verificar el sistema de notificaciones',
  url_tarea: 'https://copabplay.com.ar/admin/tareas'
};
try {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/send-task-notification-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(payloadComentario)
    }
  );
  result = await response.json();
  if (response.ok) {
    console.log('✅ Email enviado correctamente');
    console.log('   Destinatario: Max (max@copabplay.com.ar)');
    console.log('   Asunto: 💬 Nuevo comentario en tarea');
  } else {
    console.log('❌ Error:', result);
  }
} catch (error) {
  console.log('❌ Error:', error.message);
}
await sleep(1000);

// CASO 5: Modificación de Comentario
console.log('\n✏️  CASO 5: MODIFICACIÓN DE COMENTARIO');
console.log('─────────────────────────────────────────────────────');
const payloadComentarioMod = {
  usuario: 'Max',
  tipo: 'nuevo_comentario',
  mensaje: 'Tobias modificó un comentario en una tarea asignada a ti',
  tarea_id: 1001,
  tarea_nombre: 'Implementar nueva funcionalidad',
  proyecto: 'Copa bplay',
  comentario_texto: 'Comentario modificado: Actualicé la información anterior',
  url_tarea: 'https://copabplay.com.ar/admin/tareas'
};
try {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/send-task-notification-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(payloadComentarioMod)
    }
  );
  result = await response.json();
  if (response.ok) {
    console.log('✅ Email enviado correctamente');
    console.log('   Destinatario: Max (max@copabplay.com.ar)');
    console.log('   Asunto: 💬 Nuevo comentario (modificado)');
  } else {
    console.log('❌ Error:', result);
  }
} catch (error) {
  console.log('❌ Error:', error.message);
}
await sleep(1000);

// CASO 6: Eliminación de Comentario
console.log('\n🗑️  CASO 6: ELIMINACIÓN DE COMENTARIO');
console.log('─────────────────────────────────────────────────────');
const payloadComentarioDel = {
  usuario: 'Max',
  tipo: 'comentario_eliminado',
  mensaje: 'Tobias eliminó un comentario en una tarea asignada a ti',
  tarea_id: 1001,
  tarea_nombre: 'Implementar nueva funcionalidad',
  proyecto: 'Copa bplay',
  comentario_texto: 'Este era el comentario que fue eliminado',
  url_tarea: 'https://copabplay.com.ar/admin/tareas'
};
try {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/send-task-notification-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(payloadComentarioDel)
    }
  );
  result = await response.json();
  if (response.ok) {
    console.log('✅ Email enviado correctamente');
    console.log('   Destinatario: Max (max@copabplay.com.ar)');
    console.log('   Asunto: 🗑️ Comentario eliminado');
  } else {
    console.log('❌ Error:', result);
  }
} catch (error) {
  console.log('❌ Error:', error.message);
}

console.log('\n=======================================================');
console.log('VERIFICANDO LOGS DE EMAIL...');
console.log('=======================================================\n');

await sleep(2000);

const { data: emailLogs, error: logsError } = await supabase
  .from('email_logs')
  .select('*')
  .order('fecha_envio', { ascending: false })
  .limit(10);

if (logsError) {
  console.error('❌ Error al obtener logs:', logsError.message);
} else {
  console.log(`Últimos ${emailLogs.length} emails enviados:\n`);
  emailLogs.forEach((log, index) => {
    const icon = log.estado === 'enviado' ? '✅' : '❌';
    console.log(`${icon} ${index + 1}. [${log.tipo}] → ${log.usuario}`);
    console.log(`   Email: ${log.destinatario}`);
    console.log(`   Fecha: ${new Date(log.fecha_envio).toLocaleString('es-AR')}`);
    console.log(`   Estado: ${log.estado}`);
    if (log.error_mensaje) {
      console.log(`   Error: ${log.error_mensaje}`);
    }
    console.log('');
  });
}

console.log('=======================================================');
console.log('RESUMEN DE PRUEBAS COMPLETADO');
console.log('=======================================================');
console.log('\n✅ Todos los 6 casos de uso fueron probados');
console.log('📧 Verifica la casilla de correo de max@copabplay.com.ar');
console.log('⚠️  Si no ves los emails, revisa la carpeta de SPAM\n');
