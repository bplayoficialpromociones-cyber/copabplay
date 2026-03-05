const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  companyType: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const formData: ContactFormData = await req.json();

    // Prepare email content in HTML format
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .field { margin: 15px 0; }
          .label { font-weight: bold; color: #1a1a2e; }
          .value { margin-top: 5px; }
          .message-box { background: white; padding: 15px; border-left: 4px solid #1a1a2e; margin-top: 10px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Nueva Consulta de Fabricante - BPlayWin</h2>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Tipo de Empresa:</div>
              <div class="value">${formData.companyType}</div>
            </div>
            <div class="field">
              <div class="label">Nombre:</div>
              <div class="value">${formData.name}</div>
            </div>
            <div class="field">
              <div class="label">Email:</div>
              <div class="value"><a href="mailto:${formData.email}">${formData.email}</a></div>
            </div>
            <div class="field">
              <div class="label">Teléfono:</div>
              <div class="value">${formData.phone}</div>
            </div>
            <div class="field">
              <div class="label">Empresa:</div>
              <div class="value">${formData.company}</div>
            </div>
            <div class="field">
              <div class="label">Mensaje:</div>
              <div class="message-box">${formData.message}</div>
            </div>
          </div>
          <div class="footer">
            Este email fue enviado desde el formulario de contacto de fabricantes en copabplay.com.ar
          </div>
        </div>
      </body>
      </html>
    `;

    // Use SMTP.js API via fetch to send email
    const emailPayload = {
      Host: "a0020272.ferozo.com",
      Port: 465,
      Username: "landing@bplaywin.com",
      Password: "Spins2026@",
      To: "landing@bplaywin.com",
      From: "landing@bplaywin.com",
      Subject: `Nueva Consulta de Fabricante: ${formData.company} (${formData.companyType})`,
      Body: htmlContent,
      IsHTML: true,
    };

    // Use a simple SMTP approach with native fetch
    // Create the SMTP connection manually
    const smtpResponse = await sendSMTPEmail(
      "a0020272.ferozo.com",
      465,
      "landing@bplaywin.com",
      "Spins2026@",
      "landing@bplaywin.com",
      "landing@bplaywin.com",
      `Nueva Consulta de Fabricante: ${formData.company} (${formData.companyType})`,
      formData,
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
  formData: ContactFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Connect to SMTP server
    const conn = await Deno.connectTls({
      hostname: host,
      port: port,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper function to read response
    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      return n ? decoder.decode(buffer.subarray(0, n)) : "";
    };

    // Helper function to send command
    const sendCommand = async (command: string): Promise<string> => {
      await conn.write(encoder.encode(command + "\r\n"));
      return await readResponse();
    };

    // SMTP conversation
    await readResponse(); // Read greeting
    await sendCommand(`EHLO ${host}`);
    await sendCommand(`AUTH LOGIN`);
    await sendCommand(btoa(username));
    await sendCommand(btoa(password));
    await sendCommand(`MAIL FROM:<${from}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

    // Prepare email content
    const emailContent = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      `Nueva consulta de fabricante - BPlayWin`,
      ``,
      `Tipo de Empresa: ${formData.companyType}`,
      `Nombre: ${formData.name}`,
      `Email: ${formData.email}`,
      `Teléfono: ${formData.phone}`,
      `Empresa: ${formData.company}`,
      ``,
      `Mensaje:`,
      formData.message,
      ``,
      `---`,
      `Este email fue enviado desde el formulario de contacto de fabricantes en copabplay.com.ar`,
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