const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PotentialClientData {
  nombre: string;
  apellido: string;
  numero_documento: string;
  fecha_nacimiento: string;
  email: string;
  provincia: string;
  celular: string;
  tiene_cuenta_bplay: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const data: PotentialClientData = await req.json();

    // Send email using SMTP (same as manufacturer contact)
    const smtpResponse = await sendSMTPEmail(
      "a0020272.ferozo.com",
      465,
      "landing@bplaywin.com",
      "Spins2026@",
      "landing@bplaywin.com",
      "bplayoficialpromociones@gmail.com",
      "Nuevo Cliente Potencial bplay",
      data,
    );

    if (!smtpResponse.success) {
      throw new Error(smtpResponse.error || "Error al enviar email");
    }

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
    console.error("Error sending email:", error);

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

async function sendSMTPEmail(
  host: string,
  port: number,
  username: string,
  password: string,
  from: string,
  to: string,
  subject: string,
  data: PotentialClientData
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
      `Nuevo Potencial Cliente bplay`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `DATOS DEL CLIENTE`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Nombre: ${data.nombre}`,
      `Apellido: ${data.apellido}`,
      `Número de Documento: ${data.numero_documento}`,
      `Fecha de Nacimiento: ${data.fecha_nacimiento}`,
      `Email: ${data.email}`,
      `Provincia: ${data.provincia}`,
      `Celular: ${data.celular}`,
      `¿Ya tiene cuenta en bplay?: ${data.tiene_cuenta_bplay === 'si' ? 'Sí' : data.tiene_cuenta_bplay === 'no' ? 'No' : 'No recuerdo'}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Fecha de envío: ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `---`,
      `Este email fue enviado desde el formulario de clientes potenciales en copabplay.com.ar`,
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