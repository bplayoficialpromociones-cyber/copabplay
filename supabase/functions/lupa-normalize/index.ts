import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function traducirTexto(texto: string, desde: string, hacia: string): Promise<string> {
  if (!texto || desde === hacia) return texto;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto.slice(0, 400))}&langpair=${desde}|${hacia}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return texto;
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (translated && !translated.toLowerCase().includes("mymemory warning")) return translated;
  } catch {
    // ignorar
  }
  return texto;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batch_size || 20;
    const offset = body.offset || 0;

    // Noticias sin titulo_es o sin titulo_original
    const { data: noticias, error: fetchError } = await supabase
      .from("lupa_noticias")
      .select("id, titulo, titulo_es, titulo_original, descripcion, descripcion_es, idioma")
      .or("titulo_es.is.null,titulo_es.eq.,titulo_original.is.null,titulo_original.eq.")
      .order("created_at", { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (fetchError) throw fetchError;
    if (!noticias || noticias.length === 0) {
      // Normalizar hilos sin titulo_es
      const { data: hilos } = await supabase
        .from("lupa_hilos")
        .select("id, titulo, titulo_es, resumen")
        .or("titulo_es.is.null,titulo_es.eq.")
        .limit(50);

      let hilosActualizados = 0;
      if (hilos && hilos.length > 0) {
        for (const hilo of hilos) {
          const tituloEs = await traducirTexto(hilo.titulo, "en", "es");
          await supabase.from("lupa_hilos").update({
            titulo_es: tituloEs,
            resumen: tituloEs,
          }).eq("id", hilo.id);
          hilosActualizados++;
          await new Promise(r => setTimeout(r, 300));
        }
      }

      return new Response(
        JSON.stringify({ ok: true, done: true, noticias_procesadas: 0, hilos_actualizados: hilosActualizados }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let procesadas = 0;
    let errores = 0;

    for (const noticia of noticias) {
      try {
        const esIngles = noticia.idioma === "en";
        const tituloOriginal = noticia.titulo || "";

        const tituloEs = (noticia.titulo_es && noticia.titulo_es !== "")
          ? noticia.titulo_es
          : esIngles
            ? await traducirTexto(tituloOriginal, "en", "es")
            : tituloOriginal;

        const descripcionEs = (!noticia.descripcion_es || noticia.descripcion_es === "") && esIngles && noticia.descripcion
          ? await traducirTexto(noticia.descripcion, "en", "es")
          : (noticia.descripcion_es || "");

        await supabase.from("lupa_noticias").update({
          titulo_es: tituloEs.slice(0, 300),
          titulo_original: tituloOriginal.slice(0, 300),
          descripcion_es: descripcionEs.slice(0, 500),
        }).eq("id", noticia.id);

        procesadas++;
        // Respetar rate limit de MyMemory (~1 req/segundo por IP)
        await new Promise(r => setTimeout(r, 400));
      } catch {
        errores++;
      }
    }

    const hayMas = noticias.length === batchSize;

    return new Response(
      JSON.stringify({
        ok: true,
        done: !hayMas,
        procesadas,
        errores,
        siguiente_offset: offset + batchSize,
        total_en_lote: noticias.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
