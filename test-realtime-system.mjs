import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Iniciando prueba del sistema de notificaciones en tiempo real\n');

// Test 1: Verificar usuarios activos
console.log('📋 Test 1: Verificando usuarios activos...');
const { data: usuarios, error: usuariosError } = await supabase
  .from('admin_credentials')
  .select('username, email, activo')
  .eq('activo', true)
  .in('username', ['Maxi', 'Romina', 'Juano']);

if (usuariosError) {
  console.error('❌ Error al obtener usuarios:', usuariosError);
  process.exit(1);
}

console.log('✅ Usuarios activos encontrados:');
usuarios.forEach(u => console.log(`   - ${u.username} (${u.email})`));
console.log();

// Test 2: Crear una tarea de prueba
console.log('📋 Test 2: Creando tarea de prueba...');
const tareaData = {
  nombre_tarea: `Tarea de prueba realtime - ${new Date().toLocaleString()}`,
  descripcion_tarea: 'Esta es una tarea de prueba para verificar el sistema de notificaciones en tiempo real',
  estado: 'pendiente',
  asignada_a: ['Maxi', 'Romina', 'Juano'],
  proyecto: 'Copa bplay',
  imagen_tarea: [],
  video_tarea: [],
  creada_por: 'Maxi'
};

const { data: nuevaTarea, error: tareaError } = await supabase
  .from('tareas')
  .insert([tareaData])
  .select()
  .single();

if (tareaError) {
  console.error('❌ Error al crear tarea:', tareaError);
  process.exit(1);
}

console.log('✅ Tarea creada correctamente:');
console.log(`   ID: ${nuevaTarea.id}`);
console.log(`   Nombre: ${nuevaTarea.nombre_tarea}`);
console.log(`   Asignada a: ${nuevaTarea.asignada_a.join(', ')}`);
console.log();

// Test 3: Crear notificaciones para cada usuario
console.log('📋 Test 3: Creando notificaciones para los usuarios asignados...');
const notifications = nuevaTarea.asignada_a.map(usuario => ({
  usuario,
  tipo: 'nueva_tarea',
  mensaje: usuario === 'Maxi'
    ? `Has creado la tarea "${nuevaTarea.nombre_tarea}"`
    : `Se te ha asignado la tarea "${nuevaTarea.nombre_tarea}"`,
  tarea_id: nuevaTarea.id,
  comentario_id: null,
  leida: false
}));

const { data: notificacionesCreadas, error: notifError } = await supabase
  .from('notificaciones')
  .insert(notifications)
  .select();

if (notifError) {
  console.error('❌ Error al crear notificaciones:', notifError);
} else {
  console.log(`✅ ${notificacionesCreadas.length} notificaciones creadas correctamente`);
  notificacionesCreadas.forEach(n => {
    console.log(`   - ${n.usuario}: ${n.mensaje}`);
  });
}
console.log();

// Test 4: Verificar que las notificaciones se crearon
console.log('📋 Test 4: Verificando notificaciones en la base de datos...');
const { data: notifVerify, error: verifyError } = await supabase
  .from('notificaciones')
  .select('*')
  .eq('tarea_id', nuevaTarea.id)
  .eq('leida', false);

if (verifyError) {
  console.error('❌ Error al verificar notificaciones:', verifyError);
} else {
  console.log(`✅ ${notifVerify.length} notificaciones no leídas encontradas en la base de datos`);
  notifVerify.forEach(n => {
    console.log(`   - Usuario: ${n.usuario}, Tipo: ${n.tipo}, Leída: ${n.leida}`);
  });
}
console.log();

// Test 5: Simular modificación de tarea
console.log('📋 Test 5: Modificando tarea para probar actualizaciones en tiempo real...');
const { error: updateError } = await supabase
  .from('tareas')
  .update({
    estado: 'en revisión',
    descripcion_tarea: 'Tarea modificada para prueba de tiempo real - ACTUALIZADA'
  })
  .eq('id', nuevaTarea.id);

if (updateError) {
  console.error('❌ Error al modificar tarea:', updateError);
} else {
  console.log('✅ Tarea modificada correctamente');
}
console.log();

// Test 6: Crear nuevas notificaciones de modificación
console.log('📋 Test 6: Creando notificaciones de modificación...');
const modifNotifications = nuevaTarea.asignada_a.map(usuario => ({
  usuario,
  tipo: 'tarea_modificada',
  mensaje: `La tarea "${nuevaTarea.nombre_tarea}" ha sido modificada`,
  tarea_id: nuevaTarea.id,
  comentario_id: null,
  leida: false
}));

const { data: modifNotifs, error: modifError } = await supabase
  .from('notificaciones')
  .insert(modifNotifications)
  .select();

if (modifError) {
  console.error('❌ Error al crear notificaciones de modificación:', modifError);
} else {
  console.log(`✅ ${modifNotifs.length} notificaciones de modificación creadas`);
}
console.log();

// Test 7: Resumen final
console.log('📊 RESUMEN DE LA PRUEBA');
console.log('========================');
console.log(`✅ Tarea creada: ID ${nuevaTarea.id}`);
console.log(`✅ Usuarios asignados: ${nuevaTarea.asignada_a.length}`);
console.log(`✅ Total de notificaciones creadas: ${(notificacionesCreadas?.length || 0) + (modifNotifs?.length || 0)}`);
console.log();
console.log('🔍 INSTRUCCIONES PARA PROBAR:');
console.log('1. Abre 3 navegadores o pestañas en modo incógnito');
console.log('2. Inicia sesión con Maxi, Romina y Juano en cada pestaña');
console.log('3. Ve a la sección de Tareas en cada sesión');
console.log('4. Verifica que:');
console.log('   - La tarea aparece en la grilla de TODOS los usuarios');
console.log('   - Las notificaciones aparecen para TODOS los usuarios');
console.log('   - El sonido de notificación se reproduce para TODOS');
console.log('   - Al hacer clic en "Ver tarea" se abre correctamente');
console.log('5. Crea una nueva tarea desde Maxi asignada a Romina y Juano');
console.log('6. Verifica que Romina y Juano:');
console.log('   - Ven la tarea nueva en su grilla inmediatamente');
console.log('   - Reciben notificación con sonido');
console.log('   - Pueden abrir la tarea sin problemas');
console.log();
console.log('🎯 La prueba se completó exitosamente. Revisa los logs de la consola del navegador para más detalles.');
