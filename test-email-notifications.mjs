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

console.log('\n📧 Starting Email Notification System Tests\n');
console.log('='.repeat(80));

async function testEmailSystem() {
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    console.log('\n📝 Test 1: Verificar tabla email_logs existe');
    console.log('-'.repeat(80));

    const { data: logsData, error: logsError } = await supabase
      .from('email_logs')
      .select('count')
      .limit(1);

    if (logsError) {
      console.log(`❌ FAILED: Error accessing email_logs table`);
      console.log(`   Error: ${logsError.message}`);
      testsFailed++;
    } else {
      console.log(`✅ PASSED: email_logs table is accessible`);
      testsPassed++;
    }

    console.log('\n📝 Test 2: Verificar usuarios_emails configurados');
    console.log('-'.repeat(80));

    const { data: usuariosEmails, error: usuariosError } = await supabase
      .from('usuarios_emails')
      .select('usuario, email, activo')
      .eq('activo', true);

    if (usuariosError) {
      console.log(`❌ FAILED: Error accessing usuarios_emails`);
      console.log(`   Error: ${usuariosError.message}`);
      testsFailed++;
    } else {
      console.log(`✅ PASSED: Found ${usuariosEmails?.length || 0} active users`);
      if (usuariosEmails && usuariosEmails.length > 0) {
        usuariosEmails.forEach(user => {
          console.log(`   - ${user.usuario}: ${user.email}`);
        });
      }
      testsPassed++;
    }

    console.log('\n📝 Test 3: Test envío de email (Nueva Tarea)');
    console.log('-'.repeat(80));

    // Use an existing user for testing
    const testUser = usuariosEmails && usuariosEmails.length > 0 ? usuariosEmails[0].usuario : 'Max';

    const emailPayload = {
      usuario: testUser,
      tipo: 'nueva_tarea',
      mensaje: `Se te ha asignado la tarea de prueba "Test Email System"`,
      tarea_id: 999999,
      notificacion_id: crypto.randomUUID(),
      tarea_nombre: 'Test Email System',
      proyecto: 'Copa bplay',
      url_tarea: 'https://copabplay.com.ar/admin/tareas'
    };

    console.log(`Enviando email de prueba a: ${testUser}`);

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-task-notification-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify(emailPayload)
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        console.log(`✅ PASSED: Email sent successfully`);
        console.log(`   Response: ${result.message}`);
        testsPassed++;
      } else {
        console.log(`❌ FAILED: Email not sent`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${result.error || 'Unknown error'}`);
        testsFailed++;
      }
    } catch (fetchError) {
      console.log(`❌ FAILED: Error calling edge function`);
      console.log(`   Error: ${fetchError.message}`);
      testsFailed++;
    }

    console.log('\n📝 Test 4: Verificar log de email generado');
    console.log('-'.repeat(80));

    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: recentLogs, error: recentLogsError } = await supabase
      .from('email_logs')
      .select('*')
      .order('fecha_envio', { ascending: false })
      .limit(5);

    if (recentLogsError) {
      console.log(`❌ FAILED: Error reading email logs`);
      console.log(`   Error: ${recentLogsError.message}`);
      testsFailed++;
    } else {
      console.log(`✅ PASSED: Retrieved ${recentLogs?.length || 0} recent email logs`);
      if (recentLogs && recentLogs.length > 0) {
        console.log('\n   Recent emails:');
        recentLogs.forEach((log, index) => {
          console.log(`\n   ${index + 1}. Email to ${log.usuario} (${log.destinatario})`);
          console.log(`      Tipo: ${log.tipo}`);
          console.log(`      Estado: ${log.estado}`);
          console.log(`      Fecha: ${new Date(log.fecha_envio).toLocaleString('es-AR')}`);
          console.log(`      Asunto: ${log.asunto}`);
          if (log.error_mensaje) {
            console.log(`      Error: ${log.error_mensaje}`);
          }
        });
      }
      testsPassed++;
    }

    console.log('\n📝 Test 5: Verificar notificaciones recientes');
    console.log('-'.repeat(80));

    const { data: recentNotifications, error: notifError } = await supabase
      .from('notificaciones')
      .select('*')
      .order('fecha_creacion', { ascending: false })
      .limit(5);

    if (notifError) {
      console.log(`❌ FAILED: Error reading notifications`);
      console.log(`   Error: ${notifError.message}`);
      testsFailed++;
    } else {
      console.log(`✅ PASSED: Retrieved ${recentNotifications?.length || 0} recent notifications`);
      if (recentNotifications && recentNotifications.length > 0) {
        console.log('\n   Recent notifications:');
        recentNotifications.forEach((notif, index) => {
          console.log(`\n   ${index + 1}. Notificación para ${notif.usuario}`);
          console.log(`      Tipo: ${notif.tipo}`);
          console.log(`      Mensaje: ${notif.mensaje}`);
          console.log(`      Fecha: ${new Date(notif.fecha_creacion).toLocaleString('es-AR')}`);
          console.log(`      Leída: ${notif.leida ? 'Sí' : 'No'}`);
        });
      }
      testsPassed++;
    }

    console.log('\n📝 Test 6: Estadísticas de emails enviados');
    console.log('-'.repeat(80));

    const { data: statsData, error: statsError } = await supabase
      .from('email_logs')
      .select('estado, tipo');

    if (statsError) {
      console.log(`❌ FAILED: Error getting email stats`);
      testsFailed++;
    } else {
      const total = statsData?.length || 0;
      const enviados = statsData?.filter(e => e.estado === 'enviado').length || 0;
      const fallidos = statsData?.filter(e => e.estado === 'fallido').length || 0;
      const pendientes = statsData?.filter(e => e.estado === 'pendiente').length || 0;

      const porTipo = statsData?.reduce((acc, log) => {
        acc[log.tipo] = (acc[log.tipo] || 0) + 1;
        return acc;
      }, {});

      console.log(`✅ PASSED: Email statistics retrieved`);
      console.log(`\n   Total emails: ${total}`);
      console.log(`   ✅ Enviados: ${enviados}`);
      console.log(`   ❌ Fallidos: ${fallidos}`);
      console.log(`   ⏳ Pendientes: ${pendientes}`);

      if (porTipo) {
        console.log(`\n   Por tipo:`);
        Object.entries(porTipo).forEach(([tipo, count]) => {
          console.log(`      - ${tipo}: ${count}`);
        });
      }

      testsPassed++;
    }

    console.log('\n📝 Test 7: Revisar emails fallidos recientes');
    console.log('-'.repeat(80));

    const { data: failedEmails, error: failedError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('estado', 'fallido')
      .order('fecha_envio', { ascending: false })
      .limit(10);

    if (failedError) {
      console.log(`❌ FAILED: Error reading failed emails`);
      testsFailed++;
    } else {
      const failedCount = failedEmails?.length || 0;
      console.log(`✅ PASSED: Retrieved ${failedCount} recent failed emails`);

      if (failedCount > 0) {
        console.log('\n   ⚠️  Emails fallidos:');
        failedEmails.forEach((email, index) => {
          console.log(`\n   ${index + 1}. ${email.usuario} (${email.destinatario})`);
          console.log(`      Tipo: ${email.tipo}`);
          console.log(`      Fecha: ${new Date(email.fecha_envio).toLocaleString('es-AR')}`);
          console.log(`      Error: ${email.error_mensaje}`);
        });
      } else {
        console.log('   🎉 No hay emails fallidos recientes');
      }

      testsPassed++;
    }

  } catch (error) {
    console.error('\n❌ Unexpected error during tests:', error);
    testsFailed++;
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Test Results Summary\n');
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📈 Total Tests: ${testsPassed + testsFailed}`);
  console.log(`🎯 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

  if (testsFailed === 0) {
    console.log('🎉 All tests passed! Email notification system is working correctly.\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

testEmailSystem().catch(console.error);
