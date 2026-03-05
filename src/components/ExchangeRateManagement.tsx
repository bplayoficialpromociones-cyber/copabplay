import { useState, useEffect } from 'react';
import { Save, DollarSign, TrendingUp, RefreshCw, CheckCircle, AlertCircle, ArrowDown, ArrowUp, Minus, Clock, Zap, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ExchangeData {
  id: string;
  ars_to_usd: number;
  usd_to_ars: number;
  dolar_blue_compra: number;
  dolar_blue_venta: number;
  dolar_blue_promedio: number;
  fuente: string;
  updated_at: string;
  ultima_actualizacion_auto: string | null;
}

export default function ExchangeRateManagement() {
  const [data, setData] = useState<ExchangeData | null>(null);
  const [manualRate, setManualRate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchExchangeRate = async () => {
    try {
      const { data: row } = await supabase
        .from('exchange_rate_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (row) {
        setData(row);
        setManualRate(row.usd_to_ars > 0 ? row.usd_to_ars.toString() : (row.ars_to_usd > 0 ? Math.round(1 / row.ars_to_usd).toString() : ''));
      }
    } catch (err) {
      console.error('Error al obtener tipo de cambio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRate().then(() => {
      triggerDailyUpdate();
    });
  }, []);

  const triggerDailyUpdate = async () => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-dolar-blue`;
      await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      }).then(async res => {
        const result = await res.json();
        if (result.success) {
          await fetchExchangeRate();
        }
      });
    } catch {
      // silent fail — daily auto-update is best-effort
    }
  };

  const handleAutoUpdate = async () => {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-dolar-blue`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await res.json();
      if (result.success) {
        setRefreshResult({ success: true, message: result.message });
        await fetchExchangeRate();
      } else {
        setRefreshResult({ success: false, message: result.error || 'Error al obtener cotización' });
      }
    } catch (err: any) {
      setRefreshResult({ success: false, message: err.message || 'Error de conexión' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualSave = async () => {
    const arsPerUsd = parseFloat(manualRate);
    if (isNaN(arsPerUsd) || arsPerUsd <= 0) {
      alert('Ingresá un valor válido (pesos por dólar, ej: 1400)');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ars_to_usd: 1 / arsPerUsd,
        usd_to_ars: arsPerUsd,
        dolar_blue_promedio: arsPerUsd,
        fuente: 'manual',
        updated_at: new Date().toISOString(),
      };

      if (data?.id) {
        await supabase.from('exchange_rate_config').update(payload).eq('id', data.id);
      } else {
        await supabase.from('exchange_rate_config').insert(payload);
      }
      await fetchExchangeRate();
      setRefreshResult({ success: true, message: `Valor manual guardado: $${arsPerUsd.toLocaleString('es-AR')} ARS por USD` });
    } catch (err: any) {
      setRefreshResult({ success: false, message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const spread = data ? data.dolar_blue_venta - data.dolar_blue_compra : 0;
  const promedio = data?.dolar_blue_promedio || (data?.usd_to_ars ?? 0);
  const isAutoSource = data?.fuente === 'dolarapi.com';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Tipo de Cambio — Dólar Blue</h2>
        <p className="text-gray-500 text-sm mt-1">
          Cotización actualizada automáticamente una vez por día desde{' '}
          <a href="https://dolarapi.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">dolarapi.com</a>
        </p>
      </div>

      {/* Cotización actual */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-sky-400" />
            <span className="font-semibold text-slate-300">Dólar Blue — Argentina</span>
            {isAutoSource && (
              <span className="text-xs bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3" />auto
              </span>
            )}
          </div>
          <button
            onClick={handleAutoUpdate}
            disabled={refreshing}
            title="Obtener cotización actualizada ahora"
            className="flex items-center gap-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualizando...' : 'Actualizar ahora'}
          </button>
        </div>

        {/* Valores compra / promedio / venta */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs mb-1">
              <ArrowDown className="w-3 h-3" />Compra
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {data?.dolar_blue_compra > 0 ? `$${data.dolar_blue_compra.toLocaleString('es-AR')}` : '—'}
            </div>
          </div>
          <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-sky-300 text-xs mb-1">
              <Minus className="w-3 h-3" />Promedio
            </div>
            <div className="text-2xl font-bold text-sky-300">
              {promedio > 0 ? `$${promedio.toLocaleString('es-AR')}` : '—'}
            </div>
            <div className="text-xs text-slate-400 mt-1">valor de referencia</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-rose-400 text-xs mb-1">
              <ArrowUp className="w-3 h-3" />Venta
            </div>
            <div className="text-2xl font-bold text-rose-400">
              {data?.dolar_blue_venta > 0 ? `$${data.dolar_blue_venta.toLocaleString('es-AR')}` : '—'}
            </div>
          </div>
        </div>

        {/* Spread y metadata */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          {spread > 0 && (
            <span className="bg-white/5 px-2.5 py-1 rounded-lg">
              Spread: ${spread.toLocaleString('es-AR')}
            </span>
          )}
          {data?.ultima_actualizacion_auto && (
            <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg">
              <Clock className="w-3 h-3" />
              Auto: {new Date(data.ultima_actualizacion_auto).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {data?.updated_at && (
            <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg">
              Actualizado: {new Date(data.updated_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {data?.fuente && (
            <span className="bg-white/5 px-2.5 py-1 rounded-lg capitalize">
              Fuente: {data.fuente}
            </span>
          )}
        </div>
      </div>

      {/* Resultado de la actualización */}
      {refreshResult && (
        <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm border ${refreshResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {refreshResult.success
            ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />}
          <span>{refreshResult.message}</span>
        </div>
      )}

      {/* Override manual */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Save className="w-4 h-4 text-gray-500" />
          Ajuste manual
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Podés sobreescribir el valor automático si necesitás usar una cotización diferente.
        </p>
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">$</span>
            <input
              type="number"
              value={manualRate}
              onChange={e => setManualRate(e.target.value)}
              placeholder="ej: 1415"
              className="w-full pl-7 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-gray-800 font-mono"
            />
          </div>
          <span className="text-sm text-gray-400">ARS por USD</span>
          <button
            onClick={handleManualSave}
            disabled={saving}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
        {manualRate && !isNaN(parseFloat(manualRate)) && parseFloat(manualRate) > 0 && (
          <p className="text-xs text-gray-400 mt-2 font-mono">
            USD 1 = ${parseFloat(manualRate).toLocaleString('es-AR')} ARS
            &nbsp;|&nbsp;
            1 ARS = {(1 / parseFloat(manualRate)).toFixed(6)} USD
          </p>
        )}
      </div>

      {/* Info rutina diaria */}
      <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-sm text-sky-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-600" />
        <div>
          <p className="font-semibold mb-0.5">Rutina de actualización automática</p>
          <p className="text-sky-700">
            El sistema actualiza el dólar blue una vez por día al primer acceso a esta sección,
            o cuando pulsás "Actualizar ahora". El valor promedio se calcula como{' '}
            <span className="font-mono font-semibold">(compra + venta) / 2</span>{' '}
            y se usa como referencia en todo el sistema (Servicios USD, premios, etc.).
          </p>
        </div>
      </div>
    </div>
  );
}
