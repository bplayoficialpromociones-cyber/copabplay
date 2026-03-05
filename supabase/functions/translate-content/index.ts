import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEEPL_API_KEY = Deno.env.get("DEEPL_API_KEY") || "";

interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLangs: string[];
}

const languageMap: Record<string, string> = {
  es: "ES",
  en: "EN",
  pt: "PT",
  fr: "FR",
  de: "DE",
  zh: "ZH",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { text, sourceLang, targetLangs }: TranslateRequest = await req.json();

    if (!text || !sourceLang || !targetLangs || targetLangs.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const translations: Record<string, string> = {};
    translations[sourceLang] = text;

    if (DEEPL_API_KEY) {
      for (const targetLang of targetLangs) {
        if (targetLang === sourceLang) continue;

        const deeplTargetLang = languageMap[targetLang];
        if (!deeplTargetLang) continue;

        try {
          const response = await fetch("https://api-free.deepl.com/v2/translate", {
            method: "POST",
            headers: {
              "Authorization": `DeepL-Auth-Key ${DEEPL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: [text],
              source_lang: languageMap[sourceLang],
              target_lang: deeplTargetLang,
              tag_handling: "html",
            }),
          });

          if (response.ok) {
            const data = await response.json();
            translations[targetLang] = data.translations[0].text;
          } else {
            console.error(`DeepL translation failed for ${targetLang}:`, await response.text());
            translations[targetLang] = text;
          }
        } catch (error) {
          console.error(`Translation error for ${targetLang}:`, error);
          translations[targetLang] = text;
        }
      }
    } else {
      for (const targetLang of targetLangs) {
        translations[targetLang] = text;
      }
    }

    return new Response(
      JSON.stringify({ translations }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});