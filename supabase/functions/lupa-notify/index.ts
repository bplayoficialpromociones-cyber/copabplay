import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sendTelegram(botToken: string, chatId: string, message: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    return data.ok === true;
  } catch (e) {
    console.error("Error enviando a Telegram:", e);
    return false;
  }
}

function formatearCategoria(cat: string): string {
  const map: Record<string, string> = {
    "messi": "Leo Messi",
    "inter-miami": "Inter Miami CF",
    "seleccion-argentina": "Seleccion Argentina",
    "copa-mundial-2026": "Copa del Mundo 2026",
    "general": "General",
  };
  return map[cat] || cat;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: configRows } = await supabase
      .from("lupa_config")
      .select("clave, valor");

    const config: Record<string, string> = {};
    for (const row of configRows || []) {
      config[row.clave] = row.valor;
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || config["telegram_bot_token"] || "";
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID") || config["telegram_chat_id"] || "";

    // Buscar noticias no enviadas a Telegram
    const { data: noticias } = await supabase
      .from("lupa_noticias")
      .select("id, titulo, fuente, categoria, url, idioma, fecha_publicacion")
      .eq("enviado_telegram", false)
      .order("fecha_publicacion", { ascending: false })
      .limit(10);

    if (!noticias || noticias.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "No hay noticias nuevas para notificar" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let telegramEnviados = 0;

    if (botToken && chatId) {
      for (const noticia of noticias) {
        const hora = new Date(noticia.fecha_publicacion).toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Argentina/Buenos_Aires",
        });
        const idiomaTag = noticia.idioma === "en" ? " [EN]" : "";
        const categoriaLabel = formatearCategoria(noticia.categoria);

        const mensaje =
          `<b>NUEVA NOTICIA - ${categoriaLabel}${idiomaTag}</b>\n\n` +
          `${noticia.titulo}\n\n` +
          `Fuente: ${noticia.fuente} | ${hora}hs\n` +
          `<a href="${noticia.url}">Ver noticia</a>`;

        const ok = await sendTelegram(botToken, chatId, mensaje);
        if (ok) {
          telegramEnviados++;
          await supabase
            .from("lupa_noticias")
            .update({ enviado_telegram: true })
            .eq("id", noticia.id);
        }

        // Pequeña pausa para no spamear la API de Telegram
        await new Promise(r => setTimeout(r, 300));
      }
    } else {
      // Sin Telegram configurado, solo marcar como procesadas
      const ids = noticias.map(n => n.id);
      await supabase
        .from("lupa_noticias")
        .update({ enviado_telegram: true })
        .in("id", ids);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        noticias_procesadas: noticias.length,
        telegram_enviados: telegramEnviados,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error general en lupa-notify:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
