import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=================================================');
console.log('TESTING EMAIL NOTIFICATION SYSTEM');
console.log('=================================================\n');

// Test 1: Check if usuarios_emails table has data
console.log('TEST 1: Checking usuarios_emails table...');
const { data: usuarios, error: usuariosError } = await supabase
  .from('usuarios_emails')
  .select('*');

if (usuariosError) {
  console.error('❌ Error fetching usuarios_emails:', usuariosError.message);
} else {
  console.log(`✅ Found ${usuarios.length} users with emails:`);
  usuarios.forEach(u => {
    console.log(`   - ${u.usuario}: ${u.email} (Activo: ${u.activo})`);
  });
}

console.log('\n-------------------------------------------------\n');

// Test 2: Check email_logs table
console.log('TEST 2: Checking recent email logs...');
const { data: emailLogs, error: logsError } = await supabase
  .from('email_logs')
  .select('*')
  .order('fecha_envio', { ascending: false })
  .limit(10);

if (logsError) {
  console.error('❌ Error fetching email logs:', logsError.message);
} else {
  console.log(`✅ Found ${emailLogs.length} recent email logs:`);
  emailLogs.forEach(log => {
    const status = log.estado === 'enviado' ? '✅' : '❌';
    console.log(`   ${status} [${log.tipo}] to ${log.usuario} (${log.destinatario})`);
    if (log.error_mensaje) {
      console.log(`      Error: ${log.error_mensaje}`);
    }
  });
}

console.log('\n-------------------------------------------------\n');

// Test 3: Check notificaciones table
console.log('TEST 3: Checking recent notificaciones...');
const { data: notificaciones, error: notifError } = await supabase
  .from('notificaciones')
  .select('*')
  .order('fecha_creacion', { ascending: false })
  .limit(5);

if (notifError) {
  console.error('❌ Error fetching notificaciones:', notifError.message);
} else {
  console.log(`✅ Found ${notificaciones.length} recent notifications:`);
  notificaciones.forEach(notif => {
    console.log(`   - ${notif.tipo} for ${notif.usuario}: "${notif.mensaje}"`);
    console.log(`     Tarea ID: ${notif.tarea_id}, Leída: ${notif.leida}`);
  });
}

console.log('\n-------------------------------------------------\n');

// Test 4: Test sending a notification email directly
console.log('TEST 4: Testing direct email send to Edge Function...');

const testPayload = {
  usuario: 'Max',
  tipo: 'nueva_tarea',
  mensaje: 'Esta es una prueba del sistema de notificaciones por email',
  tarea_id: 1,
  tarea_nombre: 'Tarea de Prueba',
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
      body: JSON.stringify(testPayload)
    }
  );

  const result = await response.json();

  if (response.ok) {
    console.log('✅ Email test successful!');
    console.log('   Response:', result);
  } else {
    console.error('❌ Email test failed!');
    console.error('   Status:', response.status);
    console.error('   Response:', result);
  }
} catch (error) {
  console.error('❌ Error calling Edge Function:', error.message);
}

console.log('\n-------------------------------------------------\n');

// Test 5: Check if Edge Function is deployed
console.log('TEST 5: Checking Edge Function deployment...');
try {
  const testResponse = await fetch(
    `${supabaseUrl}/functions/v1/send-task-notification-email`,
    {
      method: 'OPTIONS',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      }
    }
  );

  if (testResponse.ok) {
    console.log('✅ Edge Function is deployed and responding');
  } else {
    console.error('❌ Edge Function not responding properly');
    console.error('   Status:', testResponse.status);
  }
} catch (error) {
  console.error('❌ Edge Function not accessible:', error.message);
}

console.log('\n=================================================');
console.log('EMAIL SYSTEM TEST COMPLETE');
console.log('=================================================\n');
