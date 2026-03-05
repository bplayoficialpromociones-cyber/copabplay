import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailNotification {
  usuario: string;
  tipo: 'nueva_tarea' | 'nuevo_comentario' | 'tarea_modificada' | 'comentario_eliminado' | 'comentario_modificado' | 'tarea_eliminada';
  mensaje: string;
  tarea_id: number;
  notificacion_id?: string;
  tarea_nombre?: string;
  proyecto?: string;
  comentario_texto?: string;
  url_tarea?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const notification: EmailNotification = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener configuración de iconos
    const { data: iconConfig } = await supabase
      .from('email_icons_config')
      .select('tipo_notificacion, icono_url')
      .eq('tipo_notificacion', notification.tipo)
      .maybeSingle();

    const { data: usuarioData, error: emailError } = await supabase
      .from('admin_credentials')
      .select('email, activo')
      .eq('username', notification.usuario)
      .maybeSingle();

    if (emailError || !usuarioData || !usuarioData.activo || !usuarioData.email) {
      await logEmail(supabase, {
        destinatario: 'N/A',
        usuario: notification.usuario,
        asunto: 'Email no enviado',
        cuerpo: notification.mensaje,
        tipo: notification.tipo,
        notificacion_id: notification.notificacion_id,
        tarea_id: notification.tarea_id,
        estado: 'fallido',
        error_mensaje: emailError?.message || 'Usuario sin email activo configurado',
        servicio_usado: 'SMTP',
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Usuario sin email activo'
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const usuarioEmail = usuarioData;

    const subject = getEmailSubject(notification);
    const htmlBody = getEmailBody(notification, iconConfig?.icono_url);

    const smtpResponse = await sendSMTPEmail(
      "a0020272.ferozo.com",
      465,
      "landing@bplaywin.com",
      "Spins2026@",
      "landing@bplaywin.com",
      usuarioEmail.email,
      subject,
      htmlBody,
    );

    if (!smtpResponse.success) {
      await logEmail(supabase, {
        destinatario: usuarioEmail.email,
        usuario: notification.usuario,
        asunto: subject,
        cuerpo: htmlBody,
        tipo: notification.tipo,
        notificacion_id: notification.notificacion_id,
        tarea_id: notification.tarea_id,
        estado: 'fallido',
        error_mensaje: smtpResponse.error || 'Error desconocido',
        servicio_usado: 'SMTP',
      });

      throw new Error(smtpResponse.error || "Error al enviar email");
    }

    await logEmail(supabase, {
      destinatario: usuarioEmail.email,
      usuario: notification.usuario,
      asunto: subject,
      cuerpo: htmlBody,
      tipo: notification.tipo,
      notificacion_id: notification.notificacion_id,
      tarea_id: notification.tarea_id,
      estado: 'enviado',
      error_mensaje: null,
      servicio_usado: 'SMTP',
    });

    return new Response(
      JSON.stringify({ success: true, message: "Email enviado correctamente" }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending notification email:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

function getEmailSubject(notification: EmailNotification): string {
  switch (notification.tipo) {
    case 'nueva_tarea':
      return `Se ha creado una nueva tarea: ${notification.tarea_nombre || 'Sin título'}`;
    case 'tarea_modificada':
      return `Se ha modificado la tarea: ${notification.tarea_nombre || 'Sin título'}`;
    case 'nuevo_comentario':
      return `Se ha creado un comentario para la tarea: ${notification.tarea_nombre || 'Sin título'}`;
    case 'comentario_modificado':
      return `Se ha modificado un comentario en la tarea: ${notification.tarea_nombre || 'Sin título'}`;
    case 'comentario_eliminado':
      return `Se ha eliminado un comentario en la tarea: ${notification.tarea_nombre || 'Sin título'}`;
    case 'tarea_eliminada':
      return `Se ha eliminado la tarea: ${notification.tarea_nombre || 'Sin título'}`;
    default:
      return `Notificación para la tarea: ${notification.tarea_nombre || 'Sin título'}`;
  }
}

function getEmailBody(notification: EmailNotification, customIconUrl?: string): string {
  const urlTarea = notification.url_tarea || `https://copabplay.com.ar/admin/tareas?tarea_id=${notification.tarea_id}`;

  // Iconos por defecto si no hay configuración personalizada
  const defaultIcons = {
    'nueva_tarea': 'https://img.icons8.com/fluency/96/task.png',
    'tarea_modificada': 'https://img.icons8.com/fluency/96/edit.png',
    'nuevo_comentario': 'https://img.icons8.com/fluency/96/chat.png',
    'comentario_modificado': 'https://img.icons8.com/fluency/96/edit-message.png',
    'comentario_eliminado': 'https://img.icons8.com/fluency/96/delete-message.png',
    'tarea_eliminada': 'https://img.icons8.com/fluency/96/delete-sign.png',
  };

  const iconUrl = customIconUrl || defaultIcons[notification.tipo] || 'https://img.icons8.com/fluency/96/bell.png';

  const tipoTexto = {
    'nueva_tarea': 'Nueva Tarea',
    'tarea_modificada': 'Tarea Modificada',
    'nuevo_comentario': 'Nuevo Comentario',
    'comentario_modificado': 'Comentario Modificado',
    'comentario_eliminado': 'Comentario Eliminado',
    'tarea_eliminada': 'Tarea Eliminada',
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .icon-image { width: 96px; height: 96px; margin-bottom: 15px; }
        .content { padding: 30px 20px; }
        .message { background: #f0fdf4; padding: 20px; border-left: 4px solid #16a34a; margin: 20px 0; border-radius: 4px; }
        .info-box { background: #f9fafb; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .info-label { font-weight: bold; color: #374151; margin-bottom: 5px; }
        .info-value { color: #6b7280; }
        .button { display: inline-block; background: #16a34a; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; text-align: center; }
        .button:hover { background: #15803d; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${iconUrl}" alt="Icon" class="icon-image" />
          <h1>${tipoTexto[notification.tipo] || 'Notificación'}</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${notification.usuario}</strong>,</p>

          <div class="message">
            ${notification.mensaje}
          </div>

          ${notification.tarea_nombre ? `
          <div class="info-box">
            <div class="info-label">📋 Tarea:</div>
            <div class="info-value">${notification.tarea_nombre}</div>
          </div>
          ` : ''}

          ${notification.proyecto ? `
          <div class="info-box">
            <div class="info-label">🗂️ Proyecto:</div>
            <div class="info-value">${notification.proyecto}</div>
          </div>
          ` : ''}

          ${notification.comentario_texto ? `
          <div class="info-box">
            <div class="info-label">💬 Comentario:</div>
            <div class="info-value">${notification.comentario_texto}</div>
          </div>
          ` : ''}

          <div style="text-align: center;">
            <a href="${urlTarea}" class="button">Ver Tarea Completa</a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Esta notificación ha sido generada automáticamente por el sistema de gestión de tareas de Copa BPlay.
          </p>
        </div>
        <div class="footer">
          <p><strong>Copa BPlay - Sistema de Gestión de Tareas</strong></p>
          <p>Este email fue enviado automáticamente. Para dejar de recibir notificaciones,
          actualiza tus preferencias en el panel de administración.</p>
          <p>copabplay.com.ar</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendSMTPEmail(
  host: string,
  port: number,
  username: string,
  password: string,
  from: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const conn = await Deno.connectTls({
      hostname: host,
      port: port,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      return n ? decoder.decode(buffer.subarray(0, n)) : "";
    };

    const sendCommand = async (command: string): Promise<string> => {
      await conn.write(encoder.encode(command + "\r\n"));
      return await readResponse();
    };

    await readResponse();
    await sendCommand(`EHLO ${host}`);
    await sendCommand(`AUTH LOGIN`);
    await sendCommand(btoa(username));
    await sendCommand(btoa(password));
    await sendCommand(`MAIL FROM:<${from}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

    // Helper to encode UTF-8 string to base64 properly
    const utf8ToBase64 = (str: string): string => {
      const bytes = new TextEncoder().encode(str);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };

    const boundary = "----=_Part_" + Date.now();
    const emailContent = [
      `From: Copa BPlay <${from}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${utf8ToBase64(subject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      utf8ToBase64(htmlBody),
      ``,
      `--${boundary}--`,
    ].join("\r\n");

    await conn.write(encoder.encode(emailContent + "\r\n.\r\n"));
    await readResponse();
    await sendCommand("QUIT");

    conn.close();

    return { success: true };
  } catch (error) {
    console.error("SMTP Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}

async function logEmail(supabase: any, data: {
  destinatario: string;
  usuario: string;
  asunto: string;
  cuerpo: string;
  tipo: string;
  notificacion_id?: string;
  tarea_id: number;
  estado: string;
  error_mensaje: string | null;
  servicio_usado: string;
}) {
  try {
    await supabase.from('email_logs').insert([data]);
  } catch (error) {
    console.error('Error logging email:', error);
  }
}
