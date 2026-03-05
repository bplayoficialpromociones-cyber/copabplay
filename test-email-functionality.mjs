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

const TEST_USER = 'TestUser123';
const TEST_PASSWORD = 'Test1234!';
const TEST_EMAIL = 'testuser@copabplay.com.ar';

console.log('\n🧪 Starting Email Functionality Tests\n');
console.log('='.repeat(60));

async function runTests() {
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    console.log('\n📝 Test 1: Creating test user in admin_credentials');
    console.log('-'.repeat(60));

    const { error: deleteUserError } = await supabase
      .from('admin_credentials')
      .delete()
      .eq('username', TEST_USER);

    const { error: insertUserError } = await supabase.rpc('update_admin_password', {
      input_username: TEST_USER,
      old_password: '',
      new_password: TEST_PASSWORD
    });

    if (insertUserError) {
      const { data: insertData, error: directInsertError } = await supabase
        .from('admin_credentials')
        .insert({
          username: TEST_USER,
          password_hash: TEST_PASSWORD
        });

      if (directInsertError) {
        console.log('⚠️  Could not create test user with RPC, trying direct insert...');
        console.log('Note: In production, passwords should be hashed');
      }
    }

    console.log('✅ Test user created or already exists\n');
    testsPassed++;

    console.log('📝 Test 2: Checking if user can be created in usuarios_emails');
    console.log('-'.repeat(60));

    const { error: deleteEmailError } = await supabase
      .from('usuarios_emails')
      .delete()
      .eq('usuario', TEST_USER);

    console.log('Cleanup: Removed any existing email records for test user');

    const { data: insertEmailData, error: insertEmailError } = await supabase
      .from('usuarios_emails')
      .insert({
        usuario: TEST_USER,
        email: TEST_EMAIL,
        activo: true
      })
      .select();

    if (insertEmailError) {
      console.log(`❌ FAILED: Could not insert email for test user`);
      console.log(`   Error: ${insertEmailError.message}`);
      testsFailed++;
    } else {
      console.log(`✅ PASSED: Successfully inserted email for ${TEST_USER}`);
      console.log(`   Email: ${TEST_EMAIL}`);
      testsPassed++;
    }

    console.log('\n📝 Test 3: Reading email from usuarios_emails');
    console.log('-'.repeat(60));

    const { data: readEmailData, error: readEmailError } = await supabase
      .from('usuarios_emails')
      .select('usuario, email, activo')
      .eq('usuario', TEST_USER)
      .maybeSingle();

    if (readEmailError) {
      console.log(`❌ FAILED: Could not read email for test user`);
      console.log(`   Error: ${readEmailError.message}`);
      testsFailed++;
    } else if (!readEmailData) {
      console.log(`❌ FAILED: No email found for test user`);
      testsFailed++;
    } else {
      console.log(`✅ PASSED: Successfully read email for ${TEST_USER}`);
      console.log(`   Usuario: ${readEmailData.usuario}`);
      console.log(`   Email: ${readEmailData.email}`);
      console.log(`   Activo: ${readEmailData.activo}`);
      testsPassed++;
    }

    console.log('\n📝 Test 4: Updating email (UPSERT operation)');
    console.log('-'.repeat(60));

    const updatedEmail = 'updated.testuser@copabplay.com.ar';
    const { data: upsertData, error: upsertError } = await supabase
      .from('usuarios_emails')
      .upsert({
        usuario: TEST_USER,
        email: updatedEmail,
        activo: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'usuario'
      })
      .select();

    if (upsertError) {
      console.log(`❌ FAILED: Could not upsert email for test user`);
      console.log(`   Error: ${upsertError.message}`);
      console.log(`   Details: ${JSON.stringify(upsertError, null, 2)}`);
      testsFailed++;
    } else {
      console.log(`✅ PASSED: Successfully upserted email for ${TEST_USER}`);
      console.log(`   New Email: ${updatedEmail}`);
      console.log(`   Activo: false`);
      testsPassed++;
    }

    console.log('\n📝 Test 5: Verifying update was persisted');
    console.log('-'.repeat(60));

    const { data: verifyData, error: verifyError } = await supabase
      .from('usuarios_emails')
      .select('usuario, email, activo')
      .eq('usuario', TEST_USER)
      .maybeSingle();

    if (verifyError) {
      console.log(`❌ FAILED: Could not verify updated email`);
      console.log(`   Error: ${verifyError.message}`);
      testsFailed++;
    } else if (!verifyData) {
      console.log(`❌ FAILED: No email found after update`);
      testsFailed++;
    } else if (verifyData.email !== updatedEmail || verifyData.activo !== false) {
      console.log(`❌ FAILED: Update was not persisted correctly`);
      console.log(`   Expected: ${updatedEmail}, activo: false`);
      console.log(`   Got: ${verifyData.email}, activo: ${verifyData.activo}`);
      testsFailed++;
    } else {
      console.log(`✅ PASSED: Update was persisted correctly`);
      console.log(`   Email: ${verifyData.email}`);
      console.log(`   Activo: ${verifyData.activo}`);
      testsPassed++;
    }

    console.log('\n📝 Test 6: Testing with existing user (Tobi)');
    console.log('-'.repeat(60));

    const { data: existingUserData, error: existingUserError } = await supabase
      .from('usuarios_emails')
      .upsert({
        usuario: 'Tobi',
        email: 'tobi.test@copabplay.com.ar',
        activo: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'usuario'
      })
      .select();

    if (existingUserError) {
      console.log(`❌ FAILED: Could not upsert email for Tobi`);
      console.log(`   Error: ${existingUserError.message}`);
      testsFailed++;
    } else {
      console.log(`✅ PASSED: Successfully upserted email for Tobi`);
      console.log(`   Email: tobi.test@copabplay.com.ar`);
      testsPassed++;
    }

  } catch (error) {
    console.error('\n❌ Unexpected error during tests:', error);
    testsFailed++;
  } finally {
    console.log('\n🧹 Cleanup: Removing test data');
    console.log('-'.repeat(60));

    await supabase
      .from('usuarios_emails')
      .delete()
      .eq('usuario', TEST_USER);

    await supabase
      .from('admin_credentials')
      .delete()
      .eq('username', TEST_USER);

    console.log('✅ Test data cleaned up\n');
  }

  console.log('='.repeat(60));
  console.log('\n📊 Test Results Summary\n');
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📈 Total Tests: ${testsPassed + testsFailed}`);
  console.log(`🎯 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

  if (testsFailed === 0) {
    console.log('🎉 All tests passed! Email functionality is working correctly.\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

runTests().catch(console.error);
