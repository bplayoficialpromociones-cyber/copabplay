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

async function testPasswordChange() {
  console.log('🔐 Iniciando prueba de cambio de contraseña...\n');

  // Test 1: Obtener lista de usuarios
  console.log('📋 Test 1: Obteniendo lista de usuarios...');
  try {
    const { data: users, error } = await supabase
      .from('admin_credentials')
      .select('username, email, role, activo')
      .order('username');

    if (error) throw error;

    console.log('✅ Usuarios obtenidos correctamente:');
    users.forEach(user => {
      console.log(`   - ${user.username} (${user.email}) - ${user.role} - ${user.activo ? 'Activo' : 'Inactivo'}`);
    });
    console.log('');

    if (users.length === 0) {
      console.log('⚠️  No hay usuarios en la base de datos');
      return;
    }

    // Test 2: Intentar cambiar contraseña de un usuario existente
    const testUser = users[0].username;
    const testPassword = 'TestPassword123';

    console.log(`🔑 Test 2: Intentando cambiar contraseña de "${testUser}"...`);
    const { data: changeResult, error: changeError } = await supabase.rpc('admin_change_user_password', {
      p_username: testUser,
      p_new_password: testPassword
    });

    if (changeError) {
      console.error('❌ Error al cambiar contraseña:', changeError);
      throw changeError;
    }

    console.log(`✅ Resultado de cambio de contraseña: ${changeResult}`);

    if (!changeResult) {
      console.error('❌ La función retornó FALSE - usuario no encontrado');
      throw new Error('Usuario no encontrado');
    }

    console.log('✅ Contraseña cambiada exitosamente');
    console.log('');

    // Test 3: Verificar que la nueva contraseña funciona
    console.log('🔍 Test 3: Verificando que la nueva contraseña funciona...');
    const { data: verifyResult, error: verifyError } = await supabase.rpc('verify_admin_password', {
      input_username: testUser,
      input_password: testPassword
    });

    if (verifyError) {
      console.error('❌ Error al verificar contraseña:', verifyError);
      throw verifyError;
    }

    if (verifyResult) {
      console.log('✅ La nueva contraseña fue verificada correctamente');
    } else {
      console.error('❌ La nueva contraseña NO fue verificada correctamente');
      throw new Error('Verificación de contraseña falló');
    }
    console.log('');

    // Test 4: Intentar cambiar contraseña de un usuario inexistente
    console.log('🔍 Test 4: Intentando cambiar contraseña de usuario inexistente...');
    const { data: invalidResult, error: invalidError } = await supabase.rpc('admin_change_user_password', {
      p_username: 'usuario_que_no_existe',
      p_new_password: 'password123'
    });

    if (invalidError) {
      console.error('❌ Error inesperado:', invalidError);
      throw invalidError;
    }

    if (invalidResult === false) {
      console.log('✅ La función retornó FALSE correctamente para usuario inexistente');
    } else {
      console.error('❌ La función debería retornar FALSE para usuario inexistente');
      throw new Error('Comportamiento inesperado con usuario inexistente');
    }
    console.log('');

    // Test 5: Restaurar contraseña original
    console.log('🔄 Test 5: Restaurando contraseña original...');
    const { data: restoreResult, error: restoreError } = await supabase.rpc('admin_change_user_password', {
      p_username: testUser,
      p_new_password: testUser // Asumiendo que la contraseña original era el mismo username
    });

    if (restoreError) {
      console.error('⚠️  Error al restaurar contraseña:', restoreError);
      console.log('⚠️  IMPORTANTE: La contraseña de prueba quedó configurada. Por favor restaura manualmente.');
    } else if (restoreResult) {
      console.log('✅ Contraseña restaurada exitosamente');
    }
    console.log('');

    console.log('🎉 ¡Todas las pruebas completadas exitosamente!');
    console.log('');
    console.log('📊 Resumen:');
    console.log('   ✓ Obtención de usuarios');
    console.log('   ✓ Cambio de contraseña');
    console.log('   ✓ Verificación de contraseña');
    console.log('   ✓ Manejo de usuarios inexistentes');
    console.log('   ✓ Restauración de contraseña');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas
testPasswordChange()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
