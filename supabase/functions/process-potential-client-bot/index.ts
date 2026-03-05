import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PotentialClient {
  id: string;
  nombre: string;
  apellido: string;
  numero_documento: string;
  provincia: string;
  email: string;
  tiene_cuenta_bplay: string;
  celular: string;
}

interface BotConfig {
  config_key: string;
  config_value: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { client } = await req.json() as { client: PotentialClient };

    if (!client || !client.id) {
      throw new Error("Invalid client data");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const configResponse = await fetch(`${supabaseUrl}/rest/v1/bot_configuration?select=*`, {
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
    });

    if (!configResponse.ok) {
      throw new Error("Failed to fetch bot configuration");
    }

    const configs: BotConfig[] = await configResponse.json();
    const configMap: { [key: string]: string } = {};
    configs.forEach(config => {
      configMap[config.config_key] = config.config_value;
    });

    const replaceVariables = (template: string, data: PotentialClient): string => {
      return template
        .replace(/{nombre}/g, data.nombre)
        .replace(/{apellido}/g, data.apellido)
        .replace(/{dni}/g, data.numero_documento)
        .replace(/{provincia}/g, data.provincia)
        .replace(/{email}/g, data.email)
        .replace(/{cuenta_bplay}/g, data.tiene_cuenta_bplay)
        .replace(/{celular}/g, data.celular);
    };

    const subjectTemplate = configMap['subject_template'] || 'Consulta por Fuente y Afiliador - {nombre} {apellido} - Dni {dni}';
    const descriptionTemplate = configMap['description_template'] || 'Chicos como están. Todo bien?\nMe pueden pasar por favor la info de este jugador?\n\nNombre: {nombre}\nApellido: {apellido}\nDni: {dni}\nProvincia: {provincia}\n\nEstoy necesitando (Me pueden responder en esta formato que les paso abajo por favor? nos sirve para luego llevar esa info a un excel:\n\nFuente: xxxxxxxxx\nAfiliador: xxxxxxxxx\nEmail: xxxxxxxxx\nID usuario: xxxxxxxxx\nAlias usuario bplay: xxxxxxxxx\n\nGracias.';

    const ticketSubject = replaceVariables(subjectTemplate, client);
    const ticketDescription = replaceVariables(descriptionTemplate, client);

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/bot_submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({
        potential_client_id: client.id,
        nombre: client.nombre,
        apellido: client.apellido,
        dni: client.numero_documento,
        provincia: client.provincia,
        email: client.email,
        cuenta_bplay: client.tiene_cuenta_bplay,
        status: "pending",
        ticket_subject: ticketSubject,
        ticket_description: ticketDescription,
        notification_sent: false,
      }),
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      throw new Error(`Failed to create bot submission: ${errorText}`);
    }

    const botSubmission = await insertResponse.json();
    const submissionId = botSubmission[0]?.id;

    let emailSent = false;
    let emailError: string | null = null;
    let zendeskSuccess = false;
    let zendeskError: string | null = null;

    // Intentar enviar a Zendesk
    try {
      const zendeskFormUrl = 'https://afiliadores.bplay.bet.ar/hc/es-419/requests';

      // Primero, obtener el formulario para extraer el authenticity_token
      const formPageResponse = await fetch(zendeskFormUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
        },
      });

      if (!formPageResponse.ok) {
        throw new Error(`Failed to fetch form page: ${formPageResponse.status}`);
      }

      const formPageHtml = await formPageResponse.text();

      // Extraer el authenticity_token del HTML
      const tokenMatch = formPageHtml.match(/name="authenticity_token"[^>]*value="([^"]+)"/);
      const authenticityToken = tokenMatch ? tokenMatch[1] : null;

      if (!authenticityToken) {
        throw new Error('Could not find authenticity_token in form');
      }

      // Extraer cookies de la respuesta
      const cookies = formPageResponse.headers.get('set-cookie') || '';

      // Preparar los datos del formulario
      const formData = new URLSearchParams();
      formData.append('authenticity_token', authenticityToken);
      formData.append('request[subject]', ticketSubject);
      formData.append('request[description]', ticketDescription);
      formData.append('request[requester_id]', ''); // Vacío si es anónimo

      // Enviar el formulario
      const submitResponse = await fetch(zendeskFormUrl, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://afiliadores.bplay.bet.ar',
          'Referer': zendeskFormUrl,
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-User': '?1',
          'Cookie': cookies,
        },
        body: formData.toString(),
        redirect: 'manual', // No seguir redirects automáticamente
      });

      // Zendesk redirige a una página de confirmación si tiene éxito
      if (submitResponse.status === 302 || submitResponse.status === 303 || submitResponse.ok) {
        zendeskSuccess = true;
      } else {
        throw new Error(`Zendesk submission failed with status: ${submitResponse.status}`);
      }
    } catch (error) {
      zendeskError = error instanceof Error ? error.message : 'Error desconocido al enviar a Zendesk';
      console.error('Zendesk submission error:', error);
    }

    try {
      const notificationEmail = configMap['notification_email'] || 'bplayoficialpromociones@gmail.com';
      const notificationSubject = configMap['notification_subject'] || 'YA ENVIE EL TICKET A bplay';
      const notificationBodyTemplate = configMap['notification_body_template'] || 'Ya envié el Ticket a bplay con los últimos datos del registro que se completó en copabplay.com.ar/datos\n\nEl pedido de fuente y afiliador que mandé es:\n\n{ticket_description}';
      let notificationBody = notificationBodyTemplate.replace(/{ticket_description}/g, ticketDescription);

      // Agregar el estado del envío a Zendesk
      notificationBody += '\n\n---\n';
      if (zendeskSuccess) {
        notificationBody += 'Estado del envío a Zendesk: ✅ ENVIADO EXITOSAMENTE';
      } else {
        notificationBody += `Estado del envío a Zendesk: ❌ ERROR: ${zendeskError}`;
      }

      const emailResult = await sendSMTPEmail(
        "a0020272.ferozo.com",
        465,
        "landing@bplaywin.com",
        "Spins2026@",
        "landing@bplaywin.com",
        notificationEmail,
        notificationSubject,
        notificationBody
      );

      if (!emailResult.success) {
        throw new Error(emailResult.error || "Error al enviar email");
      }

      emailSent = true;

      await fetch(`${supabaseUrl}/rest/v1/bot_submissions?id=eq.${submissionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          status: zendeskSuccess ? "success" : "partial_success",
          notification_sent: true,
          processed_at: new Date().toISOString(),
          error_message: zendeskSuccess ? null : `Zendesk: ${zendeskError}`,
        }),
      });
    } catch (error) {
      emailError = error instanceof Error ? error.message : "Error desconocido";
      console.error("Error sending notification:", error);

      const errorNotificationSubject = configMap['error_notification_subject'] || 'ERROR EN ENVIO DEL BOT';
      const errorNotificationBodyTemplate = configMap['error_notification_body_template'] || 'Hubo un error al intentar enviar el ticket a Bplay.\n\nError detectado: {error_message}\n\nDatos del cliente:\nNombre: {nombre} {apellido}\nDNI: {dni}\nProvincia: {provincia}';
      const errorNotificationBody = errorNotificationBodyTemplate
        .replace(/{error_message}/g, emailError)
        .replace(/{nombre}/g, client.nombre)
        .replace(/{apellido}/g, client.apellido)
        .replace(/{dni}/g, client.numero_documento)
        .replace(/{provincia}/g, client.provincia);

      try {
        await sendSMTPEmail(
          "a0020272.ferozo.com",
          465,
          "landing@bplaywin.com",
          "Spins2026@",
          "landing@bplaywin.com",
          configMap['notification_email'] || 'bplayoficialpromociones@gmail.com',
          errorNotificationSubject,
          errorNotificationBody
        );
      } catch (errorEmailError) {
        console.error("Failed to send error notification:", errorEmailError);
      }

      await fetch(`${supabaseUrl}/rest/v1/bot_submissions?id=eq.${submissionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          status: "error",
          error_message: emailError,
          processed_at: new Date().toISOString(),
        }),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        submissionId,
        emailSent,
        zendeskSuccess,
        zendeskError: zendeskError || null,
        ticketSubject,
        ticketDescription,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing potential client:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
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

async function sendSMTPEmail(
  host: string,
  port: number,
  username: string,
  password: string,
  from: string,
  to: string,
  subject: string,
  body: string
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

    const emailContent = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      body,
      ``,
      `---`,
      `Fecha de envío: ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`,
      `Este email fue enviado automáticamente por el bot de copabplay.com.ar`,
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