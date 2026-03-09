import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  RefreshCw, CheckCircle2, XCircle, AlertCircle,
  Flame, Star, List, Bot, User, ChevronLeft, ChevronRight,
  Rss, Link2, Tag
} from 'lucide-react';

interface ImportLog {
  id: string;
  ejecutado_en: string;
  tipo: 'manual' | 'automatico';
  fuentes_procesadas: number;
  noticias_insertadas: number;
  noticias_duplicadas: number;
  noticias_descartadas: number;
  virales: number;
  importantes: number;
  normales: number;
  version_logica: string;
  duracion_segundos: number;
  estado: 'exitoso' | 'error' | 'sin_noticias';
  error_mensaje: string | null;
}

interface LupaFuente {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  activa: boolean;
  idioma: string;
  categoria: string;
}

const PAGE_SIZE = 10;

const CATEGORIA_LABELS: Record<string, string> = {
  'messi': 'Leo Messi',
  'inter-miami': 'Inter Miami CF',
  'seleccion-argentina': 'Seleccion Argentina',
  'copa-mundial-2026': 'Copa del Mundo 2026',
};

export default function LupaImportLog() {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [fuentes, setFuentes] = useState<LupaFuente[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    const [logsRes, fuentesRes] = await Promise.all([
      supabase
        .from('lupa_import_logs')
        .select('*')
        .order('ejecutado_en', { ascending: false })
        .limit(200),
      supabase
        .from('lupa_fuentes')
        .select('id, nombre, url, tipo, activa, idioma, categoria')
        .eq('activa', true)
        .order('categoria')
        .order('nombre'),
    ]);
    setLogs(logsRes.data || []);
    setFuentes(fuentesRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const totalNoticias = logs.reduce((sum, l) => sum + (l.noticias_insertadas || 0), 0);
  const exitosas = logs.filter(l => l.estado === 'exitoso').length;
  const totalPaginas = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const logsPagina = logs.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  const categorias = Array.from(new Set(fuentes.map(f => f.categoria))).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* â”€â”€ FUENTES RSS â”€â”€ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <Rss className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-700">Fuentes activas de importacion</span>
          <span className="ml-1 text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
            {fuentes.length} fuentes
          </span>
          <button
            onClick={fetchData}
            className="ml-auto p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        {fuentes.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">Sin fuentes configuradas</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {categorias.map(cat => {
              const fuentesCat = fuentes.filter(f => f.categoria === cat);
              return (
                <div key={cat} className="px-5 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-3 h-3 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {CATEGORIA_LABELS[cat] || cat}
                    </span>
                    <span className="text-xs text-gray-400">({fuentesCat.length})</span>
                  </div>
                  <div className="space-y-2">
                    {fuentesCat.map(fuente => (
                      <div key={fuente.id} className="flex items-start gap-3 group">
                        <div className="flex-shrink-0 mt-1.5">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-800">{fuente.nombre}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              fuente.tipo === 'rss'
                                ? 'bg-orange-50 text-orange-600 border border-orange-100'
                                : 'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                              {fuente.tipo.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                              {fuente.idioma === 'es' ? 'ES' : 'EN'}
                            </span>
                          </div>
                          <a
                            href={fuente.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-400 hover:text-blue-600 transition-colors break-all"
                          >
                            {fuente.url.length > 90 ? fuente.url.slice(0, 90) + '...' : fuente.url}
                          </a>
                        </div>
                        <a
                          href={fuente.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-1.5 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* â”€â”€ RESUMEN â”€â”€ */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">ejecuciones totales</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{totalNoticias}</div>
          <div className="text-xs text-gray-500 mt-0.5">noticias importadas</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{exitosas}</div>
          <div className="text-xs text-gray-500 mt-0.5">ejecuciones exitosas</div>
        </div>
      </div>

      {/* â”€â”€ HISTORIAL â”€â”€ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <List className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Historial de importaciones</span>
          {logs.length > 0 && (
            <span className="text-xs text-gray-400 ml-1">
              {(paginaActual - 1) * PAGE_SIZE + 1}â€“{Math.min(paginaActual * PAGE_SIZE, logs.length)} de {logs.length}
            </span>
          )}
          <button
            onClick={fetchData}
            className="ml-auto p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-400">
            <List className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sin registros. El log se genera con cada importacion.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {logsPagina.map((log, idx) => {
                const num = (paginaActual - 1) * PAGE_SIZE + idx + 1;
                const fecha = new Date(log.ejecutado_en);
                const fechaStr = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const horaStr = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <div
                    key={log.id}
                    className={`px-5 py-4 flex items-start gap-3 hover:bg-gray-50/50 transition-colors ${
                      log.estado === 'error' ? 'bg-red-50/40' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 w-5 text-right mt-0.5">
                      <span className="text-xs text-gray-300 font-mono">{num}</span>
                    </div>
                    <div className="flex-shrink-0 mt-0.5">
                      {log.estado === 'exitoso' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {log.estado === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                      {log.estado === 'sin_noticias' && <AlertCircle className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-sm font-bold text-gray-900 font-mono">{fechaStr}</span>
                        <span className="text-sm font-semibold text-gray-600 font-mono">{horaStr}</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                          log.tipo === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {log.tipo === 'manual' ? <User className="w-2.5 h-2.5" /> : <Bot className="w-2.5 h-2.5" />}
                          {log.tipo === 'manual' ? 'Manual' : 'Automatico'}
                        </span>
                        {log.version_logica && (
                          <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                            {log.version_logica}
                          </span>
                        )}
                      </div>

                      {log.estado === 'exitoso' && (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                              <CheckCircle2 className="w-3 h-3" />
                              {log.noticias_insertadas} nueva{log.noticias_insertadas !== 1 ? 's' : ''}
                            </span>
                            {log.virales > 0 && (
                              <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
                                <Flame className="w-3 h-3" />
                                {log.virales} viral{log.virales !== 1 ? 'es' : ''}
                              </span>
                            )}
                            {log.importantes > 0 && (
                              <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                <Star className="w-3 h-3" />
                                {log.importantes} importante{log.importantes !== 1 ? 's' : ''}
                              </span>
                            )}
                            {log.normales > 0 && (
                              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                {log.normales} normal{log.normales !== 1 ? 'es' : ''}
                              </span>
                            )}
                            {log.noticias_descartadas > 0 && (
                              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                {log.noticias_descartadas} descartadas
                              </span>
                            )}
                            {log.noticias_duplicadas > 0 && (
                              <span className="text-xs text-gray-400">{log.noticias_duplicadas} dup.</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-gray-400">
                              {log.fuentes_procesadas} fuente{log.fuentes_procesadas !== 1 ? 's' : ''} procesadas
                            </span>
                            <span className="text-gray-200">Â·</span>
                            <span className="text-xs text-gray-400">{log.duracion_segundos}s</span>
                          </div>
                        </>
                      )}

                      {log.estado === 'sin_noticias' && (
                        <p className="text-xs text-gray-400">
                          Sin noticias nuevas Â· {log.fuentes_procesadas} fuentes revisadas Â· {log.duracion_segundos}s
                        </p>
                      )}

                      {log.estado === 'error' && log.error_mensaje && (
                        <p className="text-xs text-red-500 font-mono">{log.error_mensaje}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPaginas > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPagina(p)}
                      className={`w-7 h-7 text-xs font-medium rounded-lg transition-colors ${
                        p === paginaActual
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
