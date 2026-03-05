import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ============================================================
// MOTOR DE IA - VERSION 2.1
// Clasificador de tendencias para Messi / Inter Miami / Argentina
// ============================================================

const VERSION_LOGICA = "v2.1";

const SEÑALES_VIRALES = [
  "gol", "hat trick", "lesion", "lesionado", "transferencia", "fichaje", "contrato",
  "record", "récord", "historico", "histórico", "campeón", "campeon", "titulo", "título",
  "inauguracion", "inauguración", "debut", "primer", "ultimo", "último",
  "expulsado", "suspendido", "sancion", "sanción", "pelea", "conflicto",
  "ruptura", "crisis", "escandalo", "escándalo", "viral", "trending",
  "millones", "salario", "contrato", "renovacion", "renovación",
  "mundial", "copa", "champions", "final", "semifinal",
  "injury", "transfer", "signing", "record", "historic", "champion", "title",
  "debut", "first", "last", "banned", "suspended", "scandal", "viral",
  "million", "salary", "contract", "renewal", "world cup", "final",
  "retiro", "retirement", "despedida", "farewell",
  "instagram", "redes sociales", "publicacion", "anuncio",
  "reaccion", "reacción", "critica", "critico",
  "barrida", "penal", "penalti", "penalty",
  "marca", "rompe", "logra", "consigue", "alcanza",
  "breaks", "achieves", "reaches", "surpasses",
];

const SEÑALES_RUIDO = [
  "betting odds", "fantasy football", "daily fantasy", "shop", "store", "buy now",
  "merchandise", "jersey sale", "ticket sale", "bet now", "casino", "gambling",
  "signed photo", "autograph reprint", "photo print", "memorabilia",
  "gift idea", "birthday gift", "christmas gift",
  "preview", "prediction", "odds", "betting", "wager",
  "fotografia", "fotografía", "poster", "foto firmada",
  "libro", "book", "biography", "biografia",
];

const FUENTES_PREMIUM = [
  "marca", "sport", "mundo deportivo", "as.com", "goal.com", "espn", "bein sports",
  "tyc sports", "infobae deportes", "clarin deportes", "la nacion deportes",
  "the athletic", "guardian sport", "bbc sport",
  "inter miami official", "mls official", "afa oficial",
];

const CATEGORIAS_CONFIG: Record<string, { keywords: string[]; peso: number }> = {
  "messi": {
    keywords: ["messi", "leo messi", "lionel messi", "la pulga"],
    peso: 10,
  },
  "inter-miami": {
    keywords: ["inter miami", "intermiami", "inter miami cf", "herons", "cremaschi",
               "suarez miami", "jordi alba miami", "busquets miami", "campana miami",
               "tata martino", "chase stadium"],
    peso: 8,
  },
  "seleccion-argentina": {
    keywords: ["seleccion argentina", "argentina national", "albiceleste", "afa",
               "de paul", "mac allister", "julian alvarez", "lautaro", "enzo fernandez",
               "di maria", "scaloni", "argentina nt", "argentina team"],
    peso: 9,
  },
  "copa-mundial-2026": {
    keywords: ["world cup 2026", "copa del mundo 2026", "fifa 2026", "mundial 2026",
               "copa mundial", "concacaf", "conmebol qualifying", "clasificatorias"],
    peso: 7,
  },
};

// ============================================================
// FUNCIONES DE CLASIFICACION IA
// ============================================================

interface EvaluacionIA {
  score: number;
  importancia: "viral" | "importante" | "normal" | "descartada";
  razon: string;
  esTendencia: boolean;
  categoria: string;
}

function evaluarNoticiaIA(titulo: string, descripcion: string, fuente: string): EvaluacionIA {
  const texto = `${titulo} ${descripcion}`.toLowerCase();
  const tituloLow = titulo.toLowerCase();
  let score = 0;
  const razones: string[] = [];

  let categoria = "general";
  let pesoCategoria = 0;
  for (const [cat, config] of Object.entries(CATEGORIAS_CONFIG)) {
    if (config.keywords.some(k => texto.includes(k))) {
      categoria = cat;
      score += config.peso;
      pesoCategoria = config.peso;
      break;
    }
  }

  if (categoria === "general") {
    return {
      score: 0,
      importancia: "descartada",
      razon: "No es relevante para ninguna de nuestras categorias de interes",
      esTendencia: false,
      categoria: "general",
    };
  }

  const tieneRuido = SEÑALES_RUIDO.some(r => texto.includes(r));
  if (tieneRuido) {
    return {
      score: 2,
      importancia: "descartada",
      razon: "Contenido comercial, apuestas o producto sin valor noticioso",
      esTendencia: false,
      categoria,
    };
  }

  let señalesEnTitulo = 0;
  for (const señal of SEÑALES_VIRALES) {
    if (tituloLow.includes(señal)) {
      score += 8;
      señalesEnTitulo++;
      if (señalesEnTitulo === 1) razones.push(`señal viral en titulo: "${señal}"`);
    }
  }

  let señalesEnDesc = 0;
  for (const señal of SEÑALES_VIRALES) {
    if (descripcion.toLowerCase().includes(señal) && !tituloLow.includes(señal)) {
      score += 3;
      señalesEnDesc++;
    }
  }
  if (señalesEnDesc > 0) razones.push(`${señalesEnDesc} señales adicionales en descripcion`);

  const fuenteLow = fuente.toLowerCase();
  if (FUENTES_PREMIUM.some(f => fuenteLow.includes(f))) {
    score += 10;
    razones.push("fuente premium de alta credibilidad");
  }

  const tieneNumeros = /\d+/.test(titulo);
  if (tieneNumeros) {
    score += 3;
    razones.push("incluye datos numericos especificos");
  }

  let entidadesDetectadas = 0;
  for (const config of Object.values(CATEGORIAS_CONFIG)) {
    if (config.keywords.some(k => texto.includes(k))) entidadesDetectadas++;
  }
  if (entidadesDetectadas > 1) {
    score += 5;
    razones.push("menciona multiples sujetos de interes");
  }

  if (titulo.length < 30) {
    score -= 5;
    razones.push("titulo demasiado corto, poco informativo");
  }

  if (/top \d|best \d|\d best|\d top/i.test(titulo)) {
    score -= 8;
  }

  score = Math.max(0, Math.min(100, score));

  let importancia: EvaluacionIA["importancia"];
  if (score >= 55) {
    importancia = "viral";
    razones.unshift("VIRAL: alta concentracion de señales de impacto");
  } else if (score >= 30) {
    importancia = "importante";
    razones.unshift("IMPORTANTE: noticia relevante con valor informativo");
  } else if (score >= 15) {
    importancia = "normal";
    razones.unshift("NORMAL: noticia valida pero de impacto moderado");
  } else {
    importancia = "descartada";
    razones.unshift("DESCARTADA: score insuficiente para tendencia");
  }

  const esTendencia = score >= 30;
  const razon = razones.slice(0, 3).join(". ");

  return { score, importancia, razon, esTendencia, categoria };
}

// ============================================================
// UTILIDADES
// ============================================================

function detectarIdioma(texto: string): "es" | "en" {
  const palabrasEs = ["el ", "la ", "los ", "las ", "que ", "con ", "por ", "para ", "del ", "una ", "sus "];
  const palabrasEn = [" the ", " and ", " for ", " with ", " his ", " her ", " from ", " that "];
  const textoLower = texto.toLowerCase();
  const countEs = palabrasEs.filter(p => textoLower.includes(p)).length;
  const countEn = palabrasEn.filter(p => textoLower.includes(p)).length;
  return countEn > countEs ? "en" : "es";
}

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

function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function parsearFecha(fechaStr: string): string {
  try {
    const fecha = new Date(fechaStr);
    if (!isNaN(fecha.getTime())) return fecha.toISOString();
  } catch { /* ignorar */ }
  return new Date().toISOString();
}

async function fetchRSS(url: string): Promise<Array<{ titulo: string; descripcion: string; url: string; fecha: string; imagen?: string }>> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LaLupaDeTobi/2.0; TrendBot)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return [];
    const xml = await response.text();
    const items: Array<{ titulo: string; descripcion: string; url: string; fecha: string; imagen?: string }> = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;

    const processMatch = (content: string) => {
      const getTag = (tag: string): string => {
        const patterns = [
          new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"),
          new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
        ];
        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match?.[1]) return match[1].trim();
        }
        return "";
      };
      const getLinkAtom = (): string => {
        const linkHref = content.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/>/i);
        if (linkHref?.[1]) return linkHref[1];
        const linkTag = content.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        if (linkTag?.[1]) return linkTag[1].trim();
        return "";
      };
      const getImage = (): string => {
        const mediaContent = content.match(/<media:content[^>]+url=["']([^"']+)["']/i);
        if (mediaContent?.[1]) return mediaContent[1];
        const enclosure = content.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
        if (enclosure?.[1]) return enclosure[1];
        return "";
      };
      const clean = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
      const titulo = clean(getTag("title"));
      const link = getTag("link") || getLinkAtom();
      const descripcion = clean(getTag("description") || getTag("summary") || getTag("content")).slice(0, 500);
      const fecha = getTag("pubDate") || getTag("published") || getTag("updated") || new Date().toISOString();
      const imagen = getImage();
      if (titulo && link && link.startsWith("http")) {
        items.push({ titulo, descripcion, url: link, fecha: parsearFecha(fecha), imagen });
      }
    };

    let match;
    while ((match = itemRegex.exec(xml)) !== null) processMatch(match[1]);
    if (items.length === 0) {
      while ((match = entryRegex.exec(xml)) !== null) processMatch(match[1]);
    }
    return items.slice(0, 30);
  } catch (e) {
    console.error(`Error fetching RSS ${url}:`, e);
    return [];
  }
}

async function buscarOCrearHilo(
  supabase: ReturnType<typeof createClient>,
  categoria: string,
  titulo: string,
  tituloEs: string,
  fecha: string,
  score: number,
  importancia: string
): Promise<string | null> {
  try {
    const hace48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: hilosExistentes } = await supabase
      .from("lupa_hilos")
      .select("*")
      .eq("categoria", categoria)
      .gte("ultima_noticia_fecha", hace48h)
      .order("score_promedio", { ascending: false })
      .limit(5);

    const tituloDescriptivo = (tituloEs || titulo).slice(0, 200);

    if (hilosExistentes && hilosExistentes.length > 0) {
      const hilo = hilosExistentes[0];
      const nuevoScore = Math.round(((hilo.score_promedio || 0) * (hilo.cantidad_noticias || 1) + score) / ((hilo.cantidad_noticias || 1) + 1));
      const nuevaImportancia = nuevoScore >= 55 ? "viral" : nuevoScore >= 30 ? "importante" : "normal";

      await supabase.from("lupa_hilos").update({
        cantidad_noticias: (hilo.cantidad_noticias || 1) + 1,
        ultima_noticia_fecha: fecha,
        titulo_es: tituloDescriptivo,
        resumen: tituloDescriptivo,
        score_promedio: nuevoScore,
        importancia_hilo: nuevaImportancia,
        ultima_logica_version: VERSION_LOGICA,
      }).eq("id", hilo.id);
      return hilo.id;
    }

    const tituloHilo = CATEGORIAS_CONFIG[categoria]?.keywords[0]
      ? CATEGORIAS_CONFIG[categoria].keywords[0].split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
      : categoria;

    const impHilo = score >= 55 ? "viral" : score >= 30 ? "importante" : "normal";

    const { data: nuevoHilo } = await supabase.from("lupa_hilos").insert({
      titulo: tituloHilo,
      titulo_es: tituloDescriptivo,
      resumen: tituloDescriptivo,
      categoria,
      palabras_clave: CATEGORIAS_CONFIG[categoria]?.keywords.slice(0, 5) || [],
      cantidad_noticias: 1,
      primera_noticia_fecha: fecha,
      ultima_noticia_fecha: fecha,
      score_promedio: score,
      importancia_hilo: impHilo,
      ultima_logica_version: VERSION_LOGICA,
    }).select().maybeSingle();

    return nuevoHilo?.id || null;
  } catch (e) {
    console.error("Error en buscarOCrearHilo:", e);
    return null;
  }
}

async function updateProgress(supabase: ReturnType<typeof createClient>, data: Record<string, unknown>) {
  try {
    await supabase.from("lupa_job_progress").upsert({ id: "current", updated_at: new Date().toISOString(), ...data });
  } catch (e) {
    console.error("Error updating progress:", e);
  }
}

async function registrarImportLog(
  supabase: ReturnType<typeof createClient>,
  params: {
    tipo: string;
    fuentes_procesadas: number;
    noticias_insertadas: number;
    noticias_duplicadas: number;
    noticias_descartadas: number;
    virales: number;
    importantes: number;
    normales: number;
    duracion_segundos: number;
    estado: string;
    error_mensaje?: string;
  }
) {
  try {
    await supabase.from("lupa_import_logs").insert({
      ejecutado_en: new Date().toISOString(),
      tipo: params.tipo,
      fuentes_procesadas: params.fuentes_procesadas,
      noticias_insertadas: params.noticias_insertadas,
      noticias_duplicadas: params.noticias_duplicadas,
      noticias_descartadas: params.noticias_descartadas,
      virales: params.virales,
      importantes: params.importantes,
      normales: params.normales,
      version_logica: VERSION_LOGICA,
      duracion_segundos: params.duracion_segundos,
      estado: params.estado,
      error_mensaje: params.error_mensaje || null,
    });
  } catch (e) {
    console.error("Error registrando import log:", e);
  }
}

async function registrarLogicaIA(
  supabase: ReturnType<typeof createClient>,
  stats: { analizadas: number; virales: number; importantes: number; normales: number; descartadas: number }
) {
  try {
    const { data: existente } = await supabase
      .from("lupa_logica_ia")
      .select("id, total_analizadas, total_virales, total_importantes, total_descartadas")
      .eq("version", VERSION_LOGICA)
      .maybeSingle();

    const resumen = `Motor ${VERSION_LOGICA}: Clasifico ${stats.analizadas} noticias. ` +
      `Encontre ${stats.virales} virales (score >= 55), ${stats.importantes} importantes (score >= 30), ` +
      `${stats.normales} normales y descarte ${stats.descartadas} por ser ruido o irrelevantes. ` +
      `Solo se guardan las que tienen score >= 15 (normales, importantes y virales). ` +
      `El descarte masivo es intencional: preferimos pocas noticias de calidad a cientos de ruido.`;

    const cambios = "v2.1: Sistema de scoring multicapa. " +
      "Pesos por categoria (Messi=10, Argentina=9, Inter Miami=8, Mundial=7). " +
      "28 señales virales con peso doble en titulo. " +
      "13 señales de ruido para descarte inmediato. " +
      "Bonus por fuente premium (+10), datos numericos (+3), multiples entidades (+5). " +
      "Penalizacion por titulo corto (-5) y listas genericas (-8). " +
      "Umbrales: viral>=55, importante>=30, normal>=15, descartado<15.";

    if (existente) {
      await supabase.from("lupa_logica_ia").update({
        total_analizadas: (existente.total_analizadas || 0) + stats.analizadas,
        total_virales: (existente.total_virales || 0) + stats.virales,
        total_importantes: (existente.total_importantes || 0) + stats.importantes,
        total_descartadas: (existente.total_descartadas || 0) + stats.descartadas,
        stats_importacion: stats,
        resumen_coloquial: resumen,
      }).eq("version", VERSION_LOGICA);
    } else {
      await supabase.from("lupa_logica_ia").insert({
        version: VERSION_LOGICA,
        resumen_coloquial: resumen,
        cambios_vs_anterior: cambios,
        parametros: {
          umbrales: { viral: 55, importante: 30, normal: 15 },
          señales_virales: SEÑALES_VIRALES.length,
          señales_ruido: SEÑALES_RUIDO.length,
          categorias: Object.keys(CATEGORIAS_CONFIG),
          fuentes_premium: FUENTES_PREMIUM.length,
        },
        total_analizadas: stats.analizadas,
        total_virales: stats.virales,
        total_importantes: stats.importantes,
        total_descartadas: stats.descartadas,
        precision_estimada: stats.analizadas > 0
          ? Math.round(((stats.virales + stats.importantes) / stats.analizadas) * 100)
          : 0,
        stats_importacion: stats,
      });
    }
  } catch (e) {
    console.error("Error registrando logica IA:", e);
  }
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determinar tipo de ejecucion
    let body: { tipo?: string } = {};
    try { body = await req.json(); } catch { /* ignorar */ }
    const tipoEjecucion = body?.tipo || "automatico";

    // Limite de 48 horas: solo aceptamos noticias publicadas en las ultimas 48hs
    const limite48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: fuentes } = await supabase
      .from("lupa_fuentes")
      .select("*")
      .eq("activa", true)
      .eq("tipo", "rss");

    if (!fuentes || fuentes.length === 0) {
      await registrarImportLog(supabase, {
        tipo: tipoEjecucion,
        fuentes_procesadas: 0,
        noticias_insertadas: 0,
        noticias_duplicadas: 0,
        noticias_descartadas: 0,
        virales: 0,
        importantes: 0,
        normales: 0,
        duracion_segundos: 0,
        estado: "sin_noticias",
      });
      return new Response(JSON.stringify({ ok: true, message: "No hay fuentes activas" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalFuentes = fuentes.length;
    await updateProgress(supabase, {
      estado: "running",
      fuentes_total: totalFuentes,
      fuentes_procesadas: 0,
      noticias_insertadas: 0,
      noticias_duplicadas: 0,
      porcentaje: 0,
      ultima_noticia: "",
      fuente_actual: "Iniciando motor IA...",
      mensaje: `Analizando ${totalFuentes} fuentes con motor ${VERSION_LOGICA} (ultimas 48hs)`,
      started_at: new Date().toISOString(),
    });

    let totalInsertadas = 0;
    let totalDescartadas = 0;
    let totalDuplicadas = 0;
    let totalFueraDeRango = 0;
    let fuentesProcesadas = 0;
    let statsVirales = 0;
    let statsImportantes = 0;
    let statsNormales = 0;
    let statsAnalizadas = 0;
    const noticiasNuevas: string[] = [];

    for (const fuente of fuentes) {
      fuentesProcesadas++;
      const porcentaje = Math.round((fuentesProcesadas / totalFuentes) * 90);

      await updateProgress(supabase, {
        fuente_actual: fuente.nombre,
        fuentes_procesadas: fuentesProcesadas,
        porcentaje,
        mensaje: `IA analizando: ${fuente.nombre}`,
        noticias_insertadas: totalInsertadas,
        noticias_duplicadas: totalDuplicadas,
      });

      try {
        const items = await fetchRSS(fuente.url);

        for (const item of items) {
          // FILTRO 48H: descartar noticias mas viejas de 48hs
          const fechaNoticia = new Date(item.fecha);
          if (fechaNoticia < new Date(limite48h)) {
            totalFueraDeRango++;
            continue;
          }

          // Verificar duplicado
          const urlHash = hashUrl(item.url);
          const { data: existente } = await supabase
            .from("lupa_noticias")
            .select("id")
            .eq("url_hash", urlHash)
            .maybeSingle();
          if (existente) { totalDuplicadas++; continue; }

          statsAnalizadas++;

          // MOTOR IA: evaluar la noticia
          const evaluacion = evaluarNoticiaIA(item.titulo, item.descripcion, fuente.nombre);

          if (evaluacion.importancia === "descartada") {
            totalDescartadas++;
            continue;
          }

          const idioma = fuente.idioma || detectarIdioma(item.titulo);
          const esIngles = idioma === "en";

          const tituloEs = esIngles
            ? await traducirTexto(item.titulo.slice(0, 300), "en", "es")
            : item.titulo.slice(0, 300);
          const descripcionEs = esIngles && item.descripcion
            ? await traducirTexto(item.descripcion.slice(0, 400), "en", "es")
            : "";

          const hiloId = await buscarOCrearHilo(
            supabase,
            evaluacion.categoria,
            item.titulo,
            tituloEs,
            item.fecha,
            evaluacion.score,
            evaluacion.importancia
          );

          const { error: insertError } = await supabase.from("lupa_noticias").insert({
            titulo: item.titulo.slice(0, 300),
            titulo_original: item.titulo.slice(0, 300),
            titulo_es: tituloEs.slice(0, 300),
            descripcion: item.descripcion.slice(0, 500),
            descripcion_es: descripcionEs.slice(0, 500),
            url: item.url,
            url_hash: urlHash,
            fuente: fuente.nombre,
            fuente_url: fuente.url,
            categoria: evaluacion.categoria,
            idioma,
            imagen_url: item.imagen || "",
            fecha_publicacion: item.fecha,
            hilo_id: hiloId,
            palabras_clave: CATEGORIAS_CONFIG[evaluacion.categoria]?.keywords.slice(0, 5) || [],
            tipo_fuente: "rss",
            enviado_telegram: false,
            leida: false,
            importancia: evaluacion.importancia,
            score_ia: evaluacion.score,
            razon_importancia: evaluacion.razon,
            es_tendencia: evaluacion.esTendencia,
          });

          if (!insertError) {
            totalInsertadas++;
            if (evaluacion.importancia === "viral") statsVirales++;
            else if (evaluacion.importancia === "importante") statsImportantes++;
            else statsNormales++;

            const tituloMostrar = tituloEs || item.titulo;
            noticiasNuevas.push(tituloMostrar);
            await updateProgress(supabase, {
              noticias_insertadas: totalInsertadas,
              noticias_duplicadas: totalDuplicadas,
              ultima_noticia: tituloMostrar.slice(0, 120),
              mensaje: `[${evaluacion.importancia.toUpperCase()}] ${tituloMostrar.slice(0, 80)}`,
            });
          }
        }

        await supabase.from("lupa_fuentes").update({ ultimo_fetch: new Date().toISOString() }).eq("id", fuente.id);
      } catch (e) {
        console.error(`Error procesando fuente ${fuente.nombre}:`, e);
      }
    }

    const duracionSegundos = Math.round((Date.now() - startTime) / 1000);

    await updateProgress(supabase, {
      estado: "done",
      porcentaje: 100,
      fuente_actual: "",
      fuentes_procesadas: fuentesProcesadas,
      noticias_insertadas: totalInsertadas,
      noticias_duplicadas: totalDuplicadas,
      mensaje: `Motor IA ${VERSION_LOGICA}: ${totalInsertadas} guardadas (${statsVirales} virales, ${statsImportantes} importantes), ${totalDescartadas} descartadas, ${totalFueraDeRango} fuera de rango 48hs.`,
    });

    EdgeRuntime.waitUntil(
      registrarLogicaIA(supabase, {
        analizadas: statsAnalizadas,
        virales: statsVirales,
        importantes: statsImportantes,
        normales: statsNormales,
        descartadas: statsAnalizadas - totalInsertadas,
      })
    );

    EdgeRuntime.waitUntil(
      registrarImportLog(supabase, {
        tipo: tipoEjecucion,
        fuentes_procesadas: fuentesProcesadas,
        noticias_insertadas: totalInsertadas,
        noticias_duplicadas: totalDuplicadas,
        noticias_descartadas: totalDescartadas + totalFueraDeRango,
        virales: statsVirales,
        importantes: statsImportantes,
        normales: statsNormales,
        duracion_segundos: duracionSegundos,
        estado: "exitoso",
      })
    );

    if (noticiasNuevas.length > 0) {
      EdgeRuntime.waitUntil(
        supabase.functions.invoke("lupa-notify", {
          body: { noticias: noticiasNuevas.slice(0, 5), total: totalInsertadas },
        })
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        version_logica: VERSION_LOGICA,
        insertadas: totalInsertadas,
        descartadas_por_ia: totalDescartadas,
        fuera_de_rango_48h: totalFueraDeRango,
        duplicadas: totalDuplicadas,
        virales: statsVirales,
        importantes: statsImportantes,
        normales: statsNormales,
        fuentes_procesadas: fuentesProcesadas,
        duracion_segundos: duracionSegundos,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const duracionSegundos = Math.round((Date.now() - startTime) / 1000);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await updateProgress(supabase, { estado: "error", mensaje: `Error: ${String(e)}`, porcentaje: 0 });
    await registrarImportLog(supabase, {
      tipo: "automatico",
      fuentes_procesadas: 0,
      noticias_insertadas: 0,
      noticias_duplicadas: 0,
      noticias_descartadas: 0,
      virales: 0,
      importantes: 0,
      normales: 0,
      duracion_segundos: duracionSegundos,
      estado: "error",
      error_mensaje: String(e),
    });
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
