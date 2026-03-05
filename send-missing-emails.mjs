import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('📧 Enviando emails para notificaciones de comentarios...\n');

async function sendEmails() {
  const { data: notificaciones, error: notifError } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('tarea_id', 40)
    .eq('leida', false);

  if (notifError) {
    console.error('Error obteniendo notificaciones:', notifError);
    return;
  }

  console.log(`Encontradas ${notificaciones?.length || 0} notificaciones sin leer\n`);

  for (const notif of notificaciones || []) {
    try {
      // Get tarea data
      const { data: tarea } = await supabase
        .from('tareas')
        .select('nombre_tarea, proyecto')
        .eq('id', notif.tarea_id)
        .maybeSingle();

      // Get comment text
      const { data: comentario } = await supabase
        .from('tarea_comentarios')
        .select('contenido')
        .eq('id', notif.comentario_id)
        .maybeSingle();

      const emailPayload = {
        usuario: notif.usuario,
        tipo: notif.tipo,
        mensaje: notif.mensaje,
        tarea_id: notif.tarea_id,
        notificacion_id: notif.id,
        tarea_nombre: tarea?.nombre_tarea,
        proyecto: tarea?.proyecto,
        comentario_texto: comentario?.contenido?.substring(0, 200),
        url_tarea: `https://copabplay.com.ar/admin/tareas`
      };

      console.log(`Enviando email a ${notif.usuario}...`);

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
        console.log(`✅ Email enviado a ${notif.usuario}`);
      } else {
        console.log(`❌ Error enviando email a ${notif.usuario}: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }

  console.log('\n✅ Proceso completado');
}

sendEmails().catch(console.error);
