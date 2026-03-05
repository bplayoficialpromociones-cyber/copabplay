import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DOLAR_API_URL = "https://dolarapi.com/v1/dolares/blue";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verificar si ya se actualizó hoy (para la rutina diaria)
    const forceUpdate = req.method === "POST";

    if (!forceUpdate) {
      const { data: existing } = await supabase
        .from("exchange_rate_config")
        .select("ultima_actualizacion_auto")
        .limit(1)
        .maybeSingle();

      if (existing?.ultima_actualizacion_auto) {
        const lastUpdate = new Date(existing.ultima_actualizacion_auto);
        const now = new Date();
        const hoyStr = now.toISOString().split("T")[0];
        const lastStr = lastUpdate.toISOString().split("T")[0];

        if (hoyStr === lastStr) {
          return new Response(
            JSON.stringify({
              skipped: true,
              message: "Ya se actualizó hoy",
              ultima_actualizacion: existing.ultima_actualizacion_auto,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Llamar a dolarapi.com para obtener el dólar blue
    const apiResponse = await fetch(DOLAR_API_URL, {
      headers: { "Accept": "application/json", "User-Agent": "HaganJuego-App/1.0" },
    });

    if (!apiResponse.ok) {
      throw new Error(`dolarapi.com respondió con status ${apiResponse.status}`);
    }

    const dolarData = await apiResponse.json();

    const compra = parseFloat(dolarData.compra);
    const venta = parseFloat(dolarData.venta);

    if (isNaN(compra) || isNaN(venta) || compra <= 0 || venta <= 0) {
      throw new Error(`Datos inválidos recibidos: ${JSON.stringify(dolarData)}`);
    }

    // Promedio entre compra y venta
    const promedio = Math.round((compra + venta) / 2);

    // ars_to_usd = 1 / promedio (formato que usa el sistema para convertir ARS a USD)
    const ars_to_usd = 1 / promedio;

    // Actualizar o insertar en exchange_rate_config
    const { data: existing } = await supabase
      .from("exchange_rate_config")
      .select("id")
      .limit(1)
      .maybeSingle();

    const payload = {
      ars_to_usd,
      usd_to_ars: promedio,
      dolar_blue_compra: compra,
      dolar_blue_venta: venta,
      dolar_blue_promedio: promedio,
      fuente: "dolarapi.com",
      ultima_actualizacion_auto: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await supabase
        .from("exchange_rate_config")
        .update(payload)
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("exchange_rate_config")
        .insert(payload);

      if (error) throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        compra,
        venta,
        promedio,
        ars_to_usd,
        fuente: "dolarapi.com",
        fecha: dolarData.fechaActualizacion || new Date().toISOString(),
        message: `Dólar blue actualizado: compra $${compra} / venta $${venta} / promedio $${promedio}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error actualizando dólar blue:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
