import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  RefreshCw, ExternalLink, Layers, Clock, Globe,
  ChevronDown, ChevronUp, Rss, CheckCheck,
  AlertCircle, CheckCircle2, Zap, TrendingUp, Info,
  Brain, Flame, Star, Activity, BarChart2, Shield,
  List, Bot, User, XCircle, Link2, Tag, ChevronLeft, ChevronRight
} from 'lucide-react';

// ============================================================
// INTERFACES
// ============================================================

interface Noticia {
  id: string;
  titulo: string;
  titulo_es: string;
  titulo_original: string;
  descripcion: string;
  descripcion_es: string;
  url: string;
  fuente: string;
  categoria: string;
  idioma: string;
  imagen_url: string;
  fecha_publicacion: string;
  leida: boolean;
  hilo_id: string | null;
  importancia: 'viral' | 'importante' | 'normal' | 'descartada';
  score_ia: number;
  razon_importancia: string;
  es_tendencia: boolean;
  created_at: string;
}

interface Hilo {
  id: string;
  titulo: string;
  titulo_es: string;
  resumen: string;
  categoria: string;
  palabras_clave: string[];
  cantidad_noticias: number;
  primera_noticia_fecha: string;
  ultima_noticia_fecha: string;
  importancia_hilo: 'viral' | 'importante' | 'normal';
  score_promedio: number;
  ultima_logica_version: string;
  noticias?: Noticia[];
}

interface JobProgress {
  estado: 'idle' | 'running' | 'done' | 'error';
  fuente_actual: string;
  fuentes_total: number;
  fuentes_procesadas: number;
  noticias_insertadas: number;
  noticias_duplicadas: number;
  ultima_noticia: string;
  porcentaje: number;
  mensaje: string;
  started_at: string;
  updated_at: string;
}

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
  created_at: string;
}

interface LupaFuente {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  activa: boolean;
  idioma: string;
  categoria: string;
  ultimo_fetch: string | null;
}

interface LogicaIA {
  id: string;
  version: string;
  fecha_activacion: string;
  resumen_coloquial: string;
  cambios_vs_anterior: string;
  parametros: {
    umbrales?: { viral: number; importante: number; normal: number };
    señales_virales?: number;
    señales_ruido?: number;
    categorias?: string[];
    fuentes_premium?: number;
  };
  total_analizadas: number;
  total_virales: number;
  total_importantes: number;
  total_descartadas: number;
  precision_estimada: number;
  created_at: string;
}

// ============================================================
// CONSTANTES DE ESTILO
// ============================================================

const CATEGORIA_LABELS: Record<string, string> = {
  'messi': 'Leo Messi',
  'inter-miami': 'Inter Miami CF',
  'seleccion-argentina': 'Seleccion Argentina',
  'copa-mundial-2026': 'Copa del Mundo 2026',
  'general': 'General',
};

const CATEGORIA_COLORS: Record<string, string> = {
  'messi': 'bg-amber-100 text-amber-800 border-amber-200',
  'inter-miami': 'bg-pink-100 text-pink-800 border-pink-200',
  'seleccion-argentina': 'bg-sky-100 text-sky-800 border-sky-200',
  'copa-mundial-2026': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'general': 'bg-gray-100 text-gray-700 border-gray-200',
};

const IMPORTANCIA_CONFIG = {
  viral: {
    label: 'VIRAL',
    icon: Flame,
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-500 text-white',
    dot: 'bg-red-500',
    text: 'text-red-700',
    headerBg: 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200',
  },
  importante: {
    label: 'IMPORTANTE',
    icon: Star,
    bg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-500 text-white',
    dot: 'bg-amber-400',
    text: 'text-amber-700',
    headerBg: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200',
  },
  normal: {
    label: 'NORMAL',
    icon: Info,
    bg: 'bg-white border-gray-200',
    badge: 'bg-gray-400 text-white',
    dot: 'bg-gray-400',
    text: 'text-gray-600',
    headerBg: 'bg-white border-gray-200',
  },
};

// ============================================================
// HELPERS
// ============================================================

function tiempoRelativo(fechaStr: string): string {
  const diff = Date.now() - new Date(fechaStr).getTime();
  const mins = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);
  if (mins < 60) return `hace ${mins}m`;
  if (horas < 24) return `hace ${horas}h`;
  return `hace ${dias}d`;
}

// ============================================================
// COMPONENTE: BARRA DE PROGRESO
// ============================================================

function BarraProgreso({ progress }: { progress: JobProgress | null }) {
  if (!progress || progress.estado === 'idle') return null;
  const isRunning = progress.estado === 'running';
  const isDone = progress.estado === 'done';
  const isError = progress.estado === 'error';

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      isDone ? 'bg-emerald-50 border-emerald-200' :
      isError ? 'bg-red-50 border-red-200' :
      'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
           isError ? <AlertCircle className="w-4 h-4 text-red-600" /> :
           <Brain className="w-4 h-4 text-blue-600 animate-pulse" />}
          <span className={`text-sm font-semibold ${isDone ? 'text-emerald-800' : isError ? 'text-red-800' : 'text-blue-800'}`}>
            {isDone ? 'Motor IA completado' : isError ? 'Error en el motor' : 'Motor IA analizando...'}
          </span>
        </div>
        <span className="text-xs text-gray-500 font-mono">{progress.porcentaje}%</span>
      </div>
      <div className="h-1.5 bg-white rounded-full overflow-hidden border border-gray-100 mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : isError ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${progress.porcentaje}%` }}
        />
      </div>
      {progress.mensaje && (
        <p className="text-xs text-gray-600 truncate">{progress.mensaje}</p>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTE: SCORE BADGE
// ============================================================

function ScoreBadge({ score, importancia }: { score: number; importancia: string }) {
  const config = IMPORTANCIA_CONFIG[importancia as keyof typeof IMPORTANCIA_CONFIG] || IMPORTANCIA_CONFIG.normal;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${config.badge}`}>
      {importancia === 'viral' && <Flame className="w-3 h-3" />}
      {importancia === 'importante' && <Star className="w-3 h-3" />}
      {config.label}
      <span className="opacity-80">·{score}</span>
    </span>
  );
}

// ============================================================
// COMPONENTE: NOTICIA CARD
// ============================================================

function NoticiaCard({ noticia, onMarcarLeida }: { noticia: Noticia; onMarcarLeida: (id: string) => void }) {
  const categoriaColor = CATEGORIA_COLORS[noticia.categoria] || CATEGORIA_COLORS['general'];
  const esIngles = noticia.idioma === 'en';
  const tituloMostrar = noticia.titulo_es || noticia.titulo;
  const tituloOriginal = noticia.titulo_original || (esIngles ? noticia.titulo : '');

  return (
    <div
      className={`relative bg-white rounded-xl border transition-all hover:shadow-sm cursor-pointer ${
        noticia.leida ? 'border-gray-100 opacity-75' : 'border-gray-200'
      }`}
      onClick={() => !noticia.leida && onMarcarLeida(noticia.id)}
    >
      {!noticia.leida && <div className="absolute top-3.5 left-3.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />}
      <div className="p-3.5 pl-7">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium border ${categoriaColor}`}>
                {CATEGORIA_LABELS[noticia.categoria] || noticia.categoria}
              </span>
              <ScoreBadge score={noticia.score_ia || 0} importancia={noticia.importancia || 'normal'} />
              {esIngles && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100">
                  <Globe className="w-3 h-3" />EN
                </span>
              )}
            </div>

            {/* Titulo ES */}
            <h4 className={`text-sm font-semibold leading-snug mb-1 ${noticia.leida ? 'text-gray-500' : 'text-gray-900'}`}>
              {tituloMostrar}
            </h4>

            {/* Titulo original EN */}
            {esIngles && tituloOriginal && tituloOriginal !== tituloMostrar && (
              <p className="text-xs text-gray-400 italic mb-1.5 leading-snug">{tituloOriginal}</p>
            )}

            {/* Descripcion original */}
            {noticia.descripcion && (
              <div className="mb-1">
                {esIngles && <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block">Original</span>}
                <p className="text-xs text-gray-500 line-clamp-2">{noticia.descripcion}</p>
              </div>
            )}

            {/* Descripcion ES */}
            {esIngles && noticia.descripcion_es && (
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 mb-1.5">
                <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide block">Espanol</span>
                <p className="text-xs text-blue-800 line-clamp-2">{noticia.descripcion_es}</p>
              </div>
            )}

            {/* Razon IA */}
            {noticia.razon_importancia && (
              <p className="text-xs text-gray-400 italic line-clamp-1 mt-1">
                <Brain className="w-2.5 h-2.5 inline mr-1 opacity-60" />
                {noticia.razon_importancia}
              </p>
            )}

            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-gray-400 font-medium truncate max-w-[140px]">{noticia.fuente}</span>
              <span className="text-xs text-gray-300">·</span>
              <span className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                <Clock className="w-3 h-3" />
                {tiempoRelativo(noticia.fecha_publicacion)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <a
              href={noticia.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {noticia.imagen_url && (
              <img
                src={noticia.imagen_url}
                alt=""
                className="w-16 h-12 object-cover rounded-lg"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: HILO CARD (TENDENCIA)
// ============================================================

function HiloCard({ hilo, expandido, onToggle, onMarcarLeida }: {
  hilo: Hilo;
  expandido: boolean;
  onToggle: () => void;
  onMarcarLeida: (id: string) => void;
}) {
  const categoriaColor = CATEGORIA_COLORS[hilo.categoria] || CATEGORIA_COLORS['general'];
  const impConfig = IMPORTANCIA_CONFIG[hilo.importancia_hilo || 'normal'] || IMPORTANCIA_CONFIG.normal;
  const ImpIcon = impConfig.icon;
  const tituloHilo = hilo.titulo_es || hilo.resumen || hilo.titulo;
  const ultimaNoticia = hilo.noticias?.[0];
  const preview = hilo.resumen && hilo.resumen !== tituloHilo
    ? hilo.resumen
    : (ultimaNoticia?.titulo_es || ultimaNoticia?.titulo || '');

  return (
    <div className={`rounded-xl border overflow-hidden shadow-sm transition-all ${impConfig.bg}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 hover:bg-black/[0.02] transition-colors text-left"
      >
        {/* Icono de importancia */}
        <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${
          hilo.importancia_hilo === 'viral' ? 'bg-red-100' :
          hilo.importancia_hilo === 'importante' ? 'bg-amber-100' : 'bg-gray-100'
        }`}>
          <ImpIcon className={`w-5 h-5 ${
            hilo.importancia_hilo === 'viral' ? 'text-red-600' :
            hilo.importancia_hilo === 'importante' ? 'text-amber-600' : 'text-gray-500'
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Meta fila */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <ScoreBadge score={hilo.score_promedio || 0} importancia={hilo.importancia_hilo || 'normal'} />
            <span className={`px-1.5 py-0.5 rounded-md text-xs font-medium border ${categoriaColor}`}>
              {CATEGORIA_LABELS[hilo.categoria] || hilo.categoria}
            </span>
            <span className="text-xs font-bold text-blue-600">
              {hilo.cantidad_noticias} noticia{hilo.cantidad_noticias !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {tiempoRelativo(hilo.ultima_noticia_fecha)}
            </span>
          </div>

          {/* Titulo descriptivo */}
          <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1">
            {tituloHilo}
          </h3>

          {/* Preview de la ultima noticia */}
          {preview && preview !== tituloHilo && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-1.5">
              {preview}
            </p>
          )}

          {/* Score promedio visual */}
          <div className="flex items-center gap-2">
            <div className="flex-1 max-w-[120px] h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  (hilo.score_promedio || 0) >= 55 ? 'bg-red-500' :
                  (hilo.score_promedio || 0) >= 30 ? 'bg-amber-500' : 'bg-gray-400'
                }`}
                style={{ width: `${Math.min(100, hilo.score_promedio || 0)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">Score promedio: {hilo.score_promedio || 0}</span>
            {hilo.ultima_logica_version && (
              <span className="text-xs text-gray-300 font-mono">{hilo.ultima_logica_version}</span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 pt-1">
          {expandido ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {expandido && hilo.noticias && hilo.noticias.length > 0 && (
        <div className="border-t border-black/[0.06] p-3 space-y-2 bg-white/60 backdrop-blur-sm">
          {hilo.noticias.map(n => (
            <NoticiaCard key={n.id} noticia={n} onMarcarLeida={onMarcarLeida} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTE: PANEL LOGICA IA
// ============================================================

function LogicaIAPanel() {
  const [versiones, setVersiones] = useState<LogicaIA[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('lupa_logica_ia')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setVersiones(data || []);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-12 text-gray-400">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" />
      Cargando historial de logica IA...
    </div>
  );

  if (versiones.length === 0) return (
    <div className="text-center py-12 text-gray-400">
      <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">Sin historial aun. Ejecuta una importacion para generar el primer registro.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {versiones.map(v => (
        <div key={v.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Brain className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 font-mono">{v.version}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">activa</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(v.fecha_activacion).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              {/* Stats resumen */}
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-gray-900">{v.total_analizadas}</div>
                  <div className="text-xs text-gray-400">analizadas</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-red-600">{v.total_virales}</div>
                  <div className="text-xs text-gray-400">virales</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-amber-600">{v.total_importantes}</div>
                  <div className="text-xs text-gray-400">importantes</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-400">{v.total_descartadas}</div>
                  <div className="text-xs text-gray-400">descartadas</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Precision */}
            {v.precision_estimada > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Precision estimada</span>
                  <span className="text-sm font-bold text-gray-900">{v.precision_estimada}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      v.precision_estimada >= 60 ? 'bg-emerald-500' :
                      v.precision_estimada >= 30 ? 'bg-amber-500' : 'bg-gray-400'
                    }`}
                    style={{ width: `${v.precision_estimada}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Porcentaje de noticias clasificadas como virales o importantes sobre el total analizado
                </p>
              </div>
            )}

            {/* Descripcion coloquial */}
            {v.resumen_coloquial && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Que hizo el motor esta vez</span>
                </div>
                <p className="text-sm text-blue-900 leading-relaxed">{v.resumen_coloquial}</p>
              </div>
            )}

            {/* Cambios vs anterior */}
            {v.cambios_vs_anterior && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Mejoras de la logica</span>
                </div>
                <p className="text-sm text-amber-900 leading-relaxed">{v.cambios_vs_anterior}</p>
              </div>
            )}

            {/* Parametros */}
            {v.parametros && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {v.parametros.umbrales && (
                  <>
                    <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-center">
                      <Flame className="w-4 h-4 text-red-500 mx-auto mb-1" />
                      <div className="text-sm font-bold text-gray-900">≥{v.parametros.umbrales.viral}</div>
                      <div className="text-xs text-gray-500">Viral</div>
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-center">
                      <Star className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                      <div className="text-sm font-bold text-gray-900">≥{v.parametros.umbrales.importante}</div>
                      <div className="text-xs text-gray-500">Importante</div>
                    </div>
                  </>
                )}
                {v.parametros.señales_virales && (
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-center">
                    <Zap className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                    <div className="text-sm font-bold text-gray-900">{v.parametros.señales_virales}</div>
                    <div className="text-xs text-gray-500">Señales virales</div>
                  </div>
                )}
                {v.parametros.señales_ruido && (
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-center">
                    <Shield className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                    <div className="text-sm font-bold text-gray-900">{v.parametros.señales_ruido}</div>
                    <div className="text-xs text-gray-500">Filtros de ruido</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// COMPONENTE: LOGS DE IMPORTACION
// ============================================================

const PAGE_SIZE = 10;

const CATEGORIA_FUENTES_LABELS: Record<string, string> = {
  'messi': 'Leo Messi',
  'inter-miami': 'Inter Miami CF',
  'seleccion-argentina': 'Seleccion Argentina',
  'copa-mundial-2026': 'Copa del Mundo 2026',
};

function FuentesRSSPanel({ fuentes }: { fuentes: LupaFuente[] }) {
  if (fuentes.length === 0) return null;

  const categorias = Array.from(new Set(fuentes.map(f => f.categoria))).sort();

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <Rss className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-semibold text-gray-700">Fuentes activas de importacion</span>
        <span className="ml-1 text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">{fuentes.length} fuentes</span>
      </div>
      <div className="divide-y divide-gray-50">
        {categorias.map(cat => {
          const fuentesCat = fuentes.filter(f => f.categoria === cat);
          return (
            <div key={cat} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-3 h-3 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {CATEGORIA_FUENTES_LABELS[cat] || cat}
                </span>
                <span className="text-xs text-gray-400">({fuentesCat.length})</span>
              </div>
              <div className="space-y-1.5">
                {fuentesCat.map(fuente => (
                  <div key={fuente.id} className="flex items-center gap-3 group">
                    <div className="flex-shrink-0">
                      {fuente.activa
                        ? <div className="w-2 h-2 bg-emerald-400 rounded-full" title="Activa" />
                        : <div className="w-2 h-2 bg-gray-300 rounded-full" title="Inactiva" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-800 font-medium truncate">{fuente.nombre}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          fuente.tipo === 'rss' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
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
                        className="text-xs text-gray-400 hover:text-blue-600 truncate block max-w-md transition-colors group-hover:text-blue-500"
                      >
                        {fuente.url.length > 80 ? fuente.url.slice(0, 80) + '...' : fuente.url}
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
    </div>
  );
}

function ImportLogsPanel() {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [fuentes, setFuentes] = useState<LupaFuente[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    const [logsRes, fuentesRes] = await Promise.all([
      supabase
        .from('lupa_import_logs')
        .select('*')
        .order('ejecutado_en', { ascending: false })
        .limit(200),
      supabase
        .from('lupa_fuentes')
        .select('*')
        .eq('activa', true)
        .order('categoria')
        .order('nombre'),
    ]);
    setLogs(logsRes.data || []);
    setFuentes(fuentesRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
    refreshIntervalRef.current = setInterval(fetchLogs, 10000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [fetchLogs]);

  if (loading) return (
    <div className="flex items-center justify-center py-12 text-gray-400">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" />
      Cargando historial...
    </div>
  );

  if (logs.length === 0) return (
    <div className="space-y-4">
      <FuentesRSSPanel fuentes={fuentes} />
      <div className="text-center py-12 text-gray-400">
        <List className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Sin registros todavia. El log se genera automaticamente con cada importacion.</p>
      </div>
    </div>
  );

  const totalNoticias = logs.reduce((sum, l) => sum + l.noticias_insertadas, 0);
  const totalEjecuciones = logs.length;
  const exitosas = logs.filter(l => l.estado === 'exitoso').length;
  const totalPaginas = Math.ceil(logs.length / PAGE_SIZE);
  const paginaActual = Math.min(pagina, totalPaginas);
  const logsPagina = logs.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Fuentes RSS activas */}
      <FuentesRSSPanel fuentes={fuentes} />

      {/* Resumen general */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{totalEjecuciones}</div>
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

      {/* Lista de logs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <List className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Historial de importaciones</span>
          <span className="text-xs text-gray-400 ml-1">
            {(paginaActual - 1) * PAGE_SIZE + 1}–{Math.min(paginaActual * PAGE_SIZE, logs.length)} de {logs.length}
          </span>
          <button
            onClick={fetchLogs}
            className="ml-auto p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {logsPagina.map((log, idx) => {
            const numGlobal = (paginaActual - 1) * PAGE_SIZE + idx + 1;
            const fecha = new Date(log.ejecutado_en);
            const fechaStr = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const horaStr = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return (
              <div key={log.id} className={`px-4 py-4 flex items-start gap-3 hover:bg-gray-50/50 transition-colors ${
                log.estado === 'error' ? 'bg-red-50/40' : ''
              }`}>
                {/* Numero */}
                <div className="flex-shrink-0 w-6 text-right">
                  <span className="text-xs text-gray-300 font-mono">{numGlobal}</span>
                </div>

                {/* Icono estado */}
                <div className="flex-shrink-0 mt-0.5">
                  {log.estado === 'exitoso' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {log.estado === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                  {log.estado === 'sin_noticias' && <AlertCircle className="w-4 h-4 text-gray-400" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Fila superior: fecha + tipo + version */}
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-sm font-bold text-gray-900 font-mono tracking-tight">
                      {fechaStr}
                    </span>
                    <span className="text-sm font-semibold text-gray-600 font-mono">
                      {horaStr}
                    </span>
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

                  {/* Stats principales para exitoso */}
                  {log.estado === 'exitoso' && (
                    <div className="flex items-center gap-3 flex-wrap">
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
                        <span className="text-xs text-gray-400">
                          {log.noticias_duplicadas} duplicadas
                        </span>
                      )}
                    </div>
                  )}

                  {/* Fila inferior: fuentes + duracion */}
                  {log.estado === 'exitoso' && (
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-400">
                        {log.fuentes_procesadas} fuente{log.fuentes_procesadas !== 1 ? 's' : ''} procesadas
                      </span>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">
                        {log.duracion_segundos}s de duracion
                      </span>
                    </div>
                  )}

                  {log.estado === 'sin_noticias' && (
                    <p className="text-xs text-gray-400 mt-0.5">Sin noticias nuevas en este ciclo · {log.fuentes_procesadas} fuentes revisadas</p>
                  )}

                  {log.estado === 'error' && log.error_mensaje && (
                    <p className="text-xs text-red-500 mt-0.5 font-mono">{log.error_mensaje}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Paginado */}
        {totalPaginas > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5 rotate-[-90deg]" />
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
              <ChevronDown className="w-3.5 h-3.5 rotate-[-90deg]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PANEL PRINCIPAL
// ============================================================

type PanelTab = 'tendencias' | 'logica-ia' | 'logs';

export default function LupaNoticiasPanel() {
  const [tab, setTab] = useState<PanelTab>('tendencias');
  const [hilos, setHilos] = useState<Hilo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [hilosExpandidos, setHilosExpandidos] = useState<Set<string>>(new Set());
  const [totalNoLeidas, setTotalNoLeidas] = useState(0);
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);
  const [paginaTendencias, setPaginaTendencias] = useState(1);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHilos = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('lupa_hilos')
        .select('*')
        .order('score_promedio', { ascending: false })
        .order('ultima_noticia_fecha', { ascending: false })
        .limit(60);

      if (categoriaFiltro !== 'todas') query = query.eq('categoria', categoriaFiltro);

      const { data: hilosData } = await query;
      if (!hilosData) { setHilos([]); return; }

      const hilosConNoticias = await Promise.all(
        hilosData.map(async (hilo) => {
          const { data: noticias } = await supabase
            .from('lupa_noticias')
            .select('*')
            .eq('hilo_id', hilo.id)
            .order('score_ia', { ascending: false })
            .order('fecha_publicacion', { ascending: false })
            .limit(15);
          return { ...hilo, noticias: noticias || [] };
        })
      );

      setHilos(hilosConNoticias);

      const { count } = await supabase
        .from('lupa_noticias')
        .select('*', { count: 'exact', head: true })
        .eq('leida', false);
      setTotalNoLeidas(count || 0);
    } finally {
      setLoading(false);
    }
  }, [categoriaFiltro]);

  const fetchProgress = useCallback(async () => {
    const { data } = await supabase
      .from('lupa_job_progress')
      .select('*')
      .eq('id', 'current')
      .maybeSingle();
    if (data) setJobProgress(data as JobProgress);
    return data as JobProgress | null;
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }, []);

  const startPollingFn = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      const prog = await fetchProgress();
      if (prog?.estado === 'done' || prog?.estado === 'error') {
        stopPolling();
        setFetching(false);
        await fetchHilos();
        setTimeout(() => setJobProgress(null), 6000);
      }
    }, 2000);
  }, [fetchProgress, fetchHilos, stopPolling]);

  useEffect(() => {
    if (tab === 'tendencias') fetchHilos();
  }, [fetchHilos, tab]);

  useEffect(() => {
    fetchProgress().then((prog) => {
      if (prog?.estado === 'running') {
        setFetching(true);
        startPollingFn();
      }
    });
  }, [fetchProgress, startPollingFn]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const triggerFetch = async () => {
    setFetching(true);
    setJobProgress({
      estado: 'running', fuente_actual: 'Iniciando...',
      fuentes_total: 0, fuentes_procesadas: 0,
      noticias_insertadas: 0, noticias_duplicadas: 0,
      ultima_noticia: '', porcentaje: 0,
      mensaje: 'Iniciando motor IA de tendencias...',
      started_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    startPollingFn();
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      await fetch(`${supabaseUrl}/functions/v1/lupa-fetch-news`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'manual' }),
      });
    } catch {
      setFetching(false);
      stopPolling();
    }
  };

  const marcarTodasLeidas = async () => {
    await supabase.from('lupa_noticias').update({ leida: true }).eq('leida', false);
    setHilos(hilos.map(h => ({
      ...h,
      noticias: h.noticias?.map(n => ({ ...n, leida: true })) || [],
    })));
    setTotalNoLeidas(0);
  };

  const marcarLeida = async (id: string) => {
    await supabase.from('lupa_noticias').update({ leida: true }).eq('id', id);
    setHilos(hilos.map(h => ({
      ...h,
      noticias: h.noticias?.map(n => n.id === id ? { ...n, leida: true } : n) || [],
    })));
    setTotalNoLeidas(prev => Math.max(0, prev - 1));
  };

  const toggleHilo = (hiloId: string) => {
    const next = new Set(hilosExpandidos);
    if (next.has(hiloId)) next.delete(hiloId); else next.add(hiloId);
    setHilosExpandidos(next);
  };

  const categorias = ['todas', 'messi', 'inter-miami', 'seleccion-argentina', 'copa-mundial-2026'];
  const hilosFiltrados = hilos.filter(h => categoriaFiltro === 'todas' || h.categoria === categoriaFiltro);

  // Paginacion para tendencias (3 por pagina)
  const ITEMS_POR_PAGINA = 3;
  const totalPaginas = Math.max(1, Math.ceil(hilosFiltrados.length / ITEMS_POR_PAGINA));
  const paginaActual = Math.min(paginaTendencias, totalPaginas);
  const hilosPaginados = hilosFiltrados.slice((paginaActual - 1) * ITEMS_POR_PAGINA, paginaActual * ITEMS_POR_PAGINA);

  // Estadisticas rapidas
  const statsVirales = hilos.filter(h => h.importancia_hilo === 'viral').length;
  const statsImportantes = hilos.filter(h => h.importancia_hilo === 'importante').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Rss className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">RSS La Lupa de Tobi</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              Motor IA de tendencias · actualiza cada 4 horas
            </p>
          </div>
          {totalNoLeidas > 0 && (
            <span className="ml-1 px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
              {totalNoLeidas} nueva{totalNoLeidas !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalNoLeidas > 0 && (
            <button onClick={marcarTodasLeidas}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
              <CheckCheck className="w-4 h-4" />
              Marcar leidas
            </button>
          )}
          <button onClick={triggerFetch} disabled={fetching}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium">
            <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
            {fetching ? 'Analizando...' : 'Buscar ahora'}
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      <BarraProgreso progress={jobProgress} />

      {/* Stats rapidas */}
      {(statsVirales > 0 || statsImportantes > 0) && (
        <div className="flex items-center gap-3 flex-wrap">
          {statsVirales > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              <span className="text-sm font-semibold text-red-700">{statsVirales} tendencia{statsVirales !== 1 ? 's' : ''} virales</span>
            </div>
          )}
          {statsImportantes > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">{statsImportantes} importante{statsImportantes !== 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
            <BarChart2 className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-sm text-gray-600">{hilos.length} hilos totales</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setTab('tendencias')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'tendencias' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          Tendencias en La Lupa
        </button>
        <button
          onClick={() => setTab('logica-ia')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'logica-ia' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Brain className="w-4 h-4" />
          Logica IA
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'logs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <List className="w-4 h-4" />
          Log de Importacion
        </button>
      </div>

      {/* Tab: Tendencias */}
      {tab === 'tendencias' && (
        <>
          {/* Filtros por categoria */}
          <div className="flex items-center gap-2 flex-wrap">
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setCategoriaFiltro(cat);
                  setPaginaTendencias(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  categoriaFiltro === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {cat === 'todas' ? 'Todas' : CATEGORIA_LABELS[cat] || cat}
              </button>
            ))}
          </div>

          {/* Lista de hilos */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Cargando tendencias...
            </div>
          ) : hilosFiltrados.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <Layers className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Sin tendencias todavia</p>
              <p className="text-gray-400 text-sm mt-1">Presiona "Buscar ahora" para que el motor IA analice las fuentes</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {hilosPaginados.map(hilo => (
                  <HiloCard
                    key={hilo.id}
                    hilo={hilo}
                    expandido={hilosExpandidos.has(hilo.id)}
                    onToggle={() => toggleHilo(hilo.id)}
                    onMarcarLeida={marcarLeida}
                  />
                ))}
              </div>

              {/* Controles de paginacion */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setPaginaTendencias(p => Math.max(1, p - 1))}
                    disabled={paginaActual === 1}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      Pagina {paginaActual} de {totalPaginas}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({hilosFiltrados.length} tendencias)
                    </span>
                  </div>
                  <button
                    onClick={() => setPaginaTendencias(p => Math.min(totalPaginas, p + 1))}
                    disabled={paginaActual === totalPaginas}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Tab: Logica IA */}
      {tab === 'logica-ia' && <LogicaIAPanel />}

      {/* Tab: Logs */}
      {tab === 'logs' && <ImportLogsPanel />}
    </div>
  );
}
