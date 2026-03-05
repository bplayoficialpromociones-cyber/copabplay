import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus, Pencil, Trash2, X, Check, Globe, Server, Mail, Bot,
  Megaphone, Trophy, Package, Circle, Search, ChevronDown, ChevronUp,
  AlertCircle, Loader2, DollarSign, TrendingUp, RefreshCw, Eye,
  EyeOff, ExternalLink, Calendar, Tag, Building2, Filter, Layers,
  CheckCircle2, Ban, Clock, BarChart3, ArrowUpRight, Banknote, Info
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const PROYECTOS = ['Hagan Juego', 'Bull Power', 'Giro Ganador', 'General', 'Otro'];
const PERIODICIDADES = ['mensual', 'anual', 'unico', 'otro'] as const;
const ESTADOS = ['activo', 'cancelado', 'vencido'] as const;

const SERVICIOS_PRESET = [
  { nombre: 'Opus.pro', categoria: 'Herramienta IA' },
  { nombre: 'Chat GPT', categoria: 'Herramienta IA' },
  { nombre: 'Free Pik', categoria: 'Herramienta IA' },
  { nombre: 'Bolt', categoria: 'Herramienta IA' },
  { nombre: 'Metricool', categoria: 'Herramienta IA' },
  { nombre: 'Dominio', categoria: 'Dominio' },
  { nombre: 'Hosting', categoria: 'Hosting' },
  { nombre: 'Servidor de Email', categoria: 'Servidor de Email' },
  { nombre: 'Ads YouTube', categoria: 'Publicidad Digital' },
  { nombre: 'Ads Meta', categoria: 'Publicidad Digital' },
  { nombre: 'Ads LinkedIn', categoria: 'Publicidad Digital' },
  { nombre: 'Ads X (Twitter)', categoria: 'Publicidad Digital' },
  { nombre: 'Premios Copa bplay', categoria: 'Premios' },
];

const ICONOS_CATEGORIA: Record<string, React.ComponentType<{ className?: string }>> = {
  'Herramienta IA': Bot,
  'Dominio': Globe,
  'Hosting': Server,
  'Servidor de Email': Mail,
  'Publicidad Digital': Megaphone,
  'Premios': Trophy,
  'Software': Package,
  'Otro': Circle,
};

interface ServicioUSD {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  monto_usd: number;
  dolar_blue_referencia: number;
  monto_ars_equivalente: number;
  fecha: string;
  proyecto: string;
  periodicidad: 'mensual' | 'anual' | 'unico' | 'otro';
  estado: 'activo' | 'cancelado' | 'vencido';
  url_servicio?: string;
  notas?: string;
  creado_por: string;
  created_at: string;
}

interface CategoriaServicio {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  orden: number;
}

const emptyForm = {
  nombre: '',
  categoria: '',
  descripcion: '',
  monto_usd: '',
  dolar_blue_referencia: '',
  fecha: new Date().toISOString().split('T')[0],
  proyecto: 'General',
  periodicidad: 'mensual' as const,
  estado: 'activo' as const,
  url_servicio: '',
  notas: '',
};

export default function ServiciosUSDManagement({ currentUser }: { currentUser: string }) {
  const [servicios, setServicios] = useState<ServicioUSD[]>([]);
  const [categorias, setCategorias] = useState<CategoriaServicio[]>([]);
  const [dolarBlue, setDolarBlue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('todos');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterProyecto, setFilterProyecto] = useState('todos');
  const [sortField, setSortField] = useState<'fecha' | 'monto_usd' | 'nombre'>('fecha');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [savingCategoria, setSavingCategoria] = useState(false);
  const [usePreset, setUsePreset] = useState(false);

  useEffect(() => {
    fetchAll().then(() => {
      triggerDailyBlueUpdate();
    });
  }, []);

  async function triggerDailyBlueUpdate() {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-dolar-blue`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });
      const result = await res.json();
      if (result.success) {
        const { data: rData } = await supabase.from('exchange_rate_config').select('*').limit(1).maybeSingle();
        if (rData) {
          const blue = rData.dolar_blue_promedio > 0
            ? rData.dolar_blue_promedio
            : rData.usd_to_ars > 0
              ? rData.usd_to_ars
              : rData.ars_to_usd > 0 && rData.ars_to_usd < 1
                ? Math.round(1 / rData.ars_to_usd)
                : 0;
          setDolarBlue(blue);
        }
      }
    } catch {
      // silent fail
    }
  }

  async function fetchAll() {
    setLoading(true);
    const [{ data: sData }, { data: cData }, { data: rData }] = await Promise.all([
      supabase.from('servicios_usd').select('*').order('fecha', { ascending: false }),
      supabase.from('servicios_usd_categorias').select('*').order('orden'),
      supabase.from('exchange_rate_config').select('*').limit(1).maybeSingle(),
    ]);
    if (sData) setServicios(sData);
    if (cData) setCategorias(cData);
    if (rData) {
      const blue = rData.dolar_blue_promedio > 0
        ? rData.dolar_blue_promedio
        : rData.usd_to_ars > 0
          ? rData.usd_to_ars
          : rData.ars_to_usd > 0 && rData.ars_to_usd < 1
            ? Math.round(1 / rData.ars_to_usd)
            : 0;
      setDolarBlue(blue);
    }
    setLoading(false);
  }

  const serviciosFiltrados = useMemo(() => {
    let list = [...servicios];
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(s => s.nombre.toLowerCase().includes(t) || s.descripcion.toLowerCase().includes(t) || s.categoria.toLowerCase().includes(t));
    }
    if (filterCategoria !== 'todos') list = list.filter(s => s.categoria === filterCategoria);
    if (filterEstado !== 'todos') list = list.filter(s => s.estado === filterEstado);
    if (filterProyecto !== 'todos') list = list.filter(s => s.proyecto === filterProyecto);
    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'fecha') return dir * (new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      if (sortField === 'monto_usd') return dir * (a.monto_usd - b.monto_usd);
      if (sortField === 'nombre') return dir * a.nombre.localeCompare(b.nombre);
      return 0;
    });
    return list;
  }, [servicios, searchTerm, filterCategoria, filterEstado, filterProyecto, sortField, sortDir]);

  const metricas = useMemo(() => {
    const activos = servicios.filter(s => s.estado === 'activo');
    const totalUSD = activos.reduce((s, r) => s + r.monto_usd, 0);
    const totalARS = activos.reduce((s, r) => s + r.monto_ars_equivalente, 0);
    const mensualesUSD = activos.filter(s => s.periodicidad === 'mensual').reduce((s, r) => s + r.monto_usd, 0);
    const porCategoria = categorias.map(c => ({
      nombre: c.nombre,
      totalUSD: activos.filter(s => s.categoria === c.nombre).reduce((s, r) => s + r.monto_usd, 0),
    })).filter(x => x.totalUSD > 0);
    return { totalUSD, totalARS, mensualesUSD, porCategoria };
  }, [servicios, categorias]);

  function calcARS(monto_usd: string, dolar: string) {
    const u = parseFloat(monto_usd) || 0;
    const d = parseFloat(dolar) || 0;
    return u * d;
  }

  function openNew() {
    setForm({ ...emptyForm, dolar_blue_referencia: dolarBlue > 0 ? dolarBlue.toString() : '' });
    setEditingId(null);
    setUsePreset(false);
    setError('');
    setShowForm(true);
  }

  function openEdit(s: ServicioUSD) {
    setForm({
      nombre: s.nombre,
      categoria: s.categoria,
      descripcion: s.descripcion,
      monto_usd: s.monto_usd.toString(),
      dolar_blue_referencia: s.dolar_blue_referencia.toString(),
      fecha: s.fecha,
      proyecto: s.proyecto,
      periodicidad: s.periodicidad,
      estado: s.estado,
      url_servicio: s.url_servicio || '',
      notas: s.notas || '',
    });
    setEditingId(s.id);
    setUsePreset(false);
    setError('');
    setShowForm(true);
  }

  function applyPreset(p: { nombre: string; categoria: string }) {
    setForm(f => ({ ...f, nombre: p.nombre, categoria: p.categoria }));
    setUsePreset(false);
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!form.categoria.trim()) { setError('La categoría es obligatoria.'); return; }
    if (!form.monto_usd || isNaN(Number(form.monto_usd)) || Number(form.monto_usd) <= 0) { setError('El monto en USD debe ser mayor a cero.'); return; }
    if (!form.dolar_blue_referencia || isNaN(Number(form.dolar_blue_referencia)) || Number(form.dolar_blue_referencia) <= 0) { setError('La cotización dólar blue es obligatoria.'); return; }

    setSaving(true);
    setError('');

    const payload = {
      nombre: form.nombre.trim(),
      categoria: form.categoria.trim(),
      descripcion: form.descripcion.trim(),
      monto_usd: Number(form.monto_usd),
      dolar_blue_referencia: Number(form.dolar_blue_referencia),
      monto_ars_equivalente: calcARS(form.monto_usd, form.dolar_blue_referencia),
      fecha: form.fecha,
      proyecto: form.proyecto,
      periodicidad: form.periodicidad,
      estado: form.estado,
      url_servicio: form.url_servicio.trim() || null,
      notas: form.notas.trim() || null,
      creado_por: currentUser,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      await supabase.from('servicios_usd').update(payload).eq('id', editingId);
    } else {
      await supabase.from('servicios_usd').insert(payload);
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    await fetchAll();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from('servicios_usd').delete().eq('id', id);
    setDeletingId(null);
    setConfirmDelete(null);
    await fetchAll();
  }

  async function handleAddCategoria() {
    if (!nuevaCategoria.trim()) return;
    setSavingCategoria(true);
    await supabase.from('servicios_usd_categorias').insert({
      nombre: nuevaCategoria.trim(),
      descripcion: '',
      icono: 'Circle',
      orden: categorias.length + 1,
    });
    setNuevaCategoria('');
    setSavingCategoria(false);
    const { data } = await supabase.from('servicios_usd_categorias').select('*').order('orden');
    if (data) setCategorias(data);
  }

  function toggleSort(f: 'fecha' | 'monto_usd' | 'nombre') {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-sky-400" />
            Servicios en USD
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Gestión de servicios pagados en dólares — referencia dólar blue
            {dolarBlue > 0 && (
              <span className="ml-2 text-emerald-400 font-medium">
                (Blue: $ {dolarBlue.toLocaleString('es-AR')})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoriaModal(true)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 px-3 py-2 rounded-lg transition-all"
          >
            <Tag className="w-3.5 h-3.5" />
            Categorías
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-sky-900/30"
          >
            <Plus className="w-4 h-4" />
            Nuevo servicio
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total servicios activos</span>
            <DollarSign className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-sky-400">USD {formatUSD(metricas.totalUSD)}</div>
          <div className="text-xs text-gray-500 mt-1">{formatARS(metricas.totalARS)} ARS equiv.</div>
        </div>
        <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Gasto mensual recurrente</span>
            <RefreshCw className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400">USD {formatUSD(metricas.mensualesUSD)}</div>
          <div className="text-xs text-gray-500 mt-1">Solo periodicidad mensual</div>
        </div>
        <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total registros</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{servicios.length}</div>
          <div className="text-xs text-gray-500 mt-1">{servicios.filter(s => s.estado === 'activo').length} activos</div>
        </div>
      </div>

      {/* Gráfico por categoría */}
      {metricas.porCategoria.length > 0 && (
        <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            Gasto por categoría (USD) — servicios activos
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={metricas.porCategoria} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="nombre" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={v => 'USD ' + v} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                formatter={(v: number) => ['USD ' + formatUSD(v), 'Total USD']}
              />
              <Bar dataKey="totalUSD" radius={[4, 4, 0, 0]}>
                {metricas.porCategoria.map((_: any, i: number) => (
                  <Cell key={i} fill={['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#8b5cf6'][i % 8]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Nota dólar blue */}
      {dolarBlue === 0 && (
        <div className="flex items-start gap-2 bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3 text-sm text-amber-400">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            No hay cotización del dólar blue configurada. Ingresá el valor manualmente en cada registro,
            o actualizalo en <strong>Tipo de Cambio</strong> para que se auto-complete.
          </span>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 overflow-hidden">
        {/* Filtros */}
        <div className="p-4 border-b border-gray-700/50 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar servicio..."
                className="w-full bg-gray-900/60 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <FilterSelect value={filterCategoria} onChange={setFilterCategoria}
                options={[{ value: 'todos', label: 'Categorías' }, ...categorias.map(c => ({ value: c.nombre, label: c.nombre }))]}
                icon={<Tag className="w-3.5 h-3.5" />} accentColor="sky" />
              <FilterSelect value={filterEstado} onChange={setFilterEstado}
                options={[{ value: 'todos', label: 'Estados' }, { value: 'activo', label: 'Activo' }, { value: 'cancelado', label: 'Cancelado' }, { value: 'vencido', label: 'Vencido' }]}
                icon={<Filter className="w-3.5 h-3.5" />} accentColor="sky" />
              <FilterSelect value={filterProyecto} onChange={setFilterProyecto}
                options={[{ value: 'todos', label: 'Proyectos' }, ...PROYECTOS.map(p => ({ value: p, label: p }))]}
                icon={<Building2 className="w-3.5 h-3.5" />} accentColor="sky" />
            </div>
          </div>
          <div className="text-xs text-gray-500">{serviciosFiltrados.length} registro{serviciosFiltrados.length !== 1 ? 's' : ''}</div>
        </div>

        {serviciosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Sin servicios registrados</p>
            <p className="text-xs mt-1">Crea el primero con el botón "Nuevo servicio"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">
                    <button onClick={() => toggleSort('nombre')} className="flex items-center gap-1 hover:text-white transition-colors">
                      Servicio <SortIcon field="nombre" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Categoría</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">
                    <button onClick={() => toggleSort('monto_usd')} className="flex items-center gap-1 hover:text-white transition-colors ml-auto">
                      USD <SortIcon field="monto_usd" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Dólar Blue</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Equiv. ARS</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">
                    <button onClick={() => toggleSort('fecha')} className="flex items-center gap-1 hover:text-white transition-colors">
                      Fecha <SortIcon field="fecha" />
                    </button>
                  </th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium">Período</th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium">Estado</th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {serviciosFiltrados.map(s => (
                  <tr key={s.id} className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CategoriaIcon categoria={s.categoria} className="w-4 h-4 text-sky-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-white font-medium truncate max-w-[160px]">{s.nombre}</div>
                          {s.url_servicio && (
                            <a href={s.url_servicio} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-sky-500 hover:text-sky-400 flex items-center gap-0.5">
                              <ExternalLink className="w-2.5 h-2.5" />ver
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-sky-400/10 text-sky-400 border border-sky-400/20 px-2 py-0.5 rounded-full">{s.categoria}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-sky-400">USD {formatUSD(s.monto_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      $ {s.dolar_blue_referencia.toLocaleString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300 text-xs">{formatARS(s.monto_ars_equivalente)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatFecha(s.fecha)}</td>
                    <td className="px-4 py-3 text-center">
                      <PeriodicidadBadge p={s.periodicidad} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <EstadoBadge estado={s.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {confirmDelete === s.id ? (
                          <>
                            <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id}
                              className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50">
                              {deletingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => setConfirmDelete(null)} className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setConfirmDelete(s.id)} className="p-1.5 hover:bg-red-900/40 text-gray-400 hover:text-red-400 rounded-lg transition-colors" title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-600/50 bg-gray-900/40">
                  <td colSpan={2} className="px-4 py-2.5 text-xs text-gray-500 font-medium">
                    Total filtrado ({serviciosFiltrados.length})
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm font-bold text-sky-400">
                    USD {formatUSD(serviciosFiltrados.reduce((s, r) => s + r.monto_usd, 0))}
                  </td>
                  <td />
                  <td className="px-4 py-2.5 text-right text-xs text-gray-400 font-medium">
                    {formatARS(serviciosFiltrados.reduce((s, r) => s + r.monto_ars_equivalente, 0))}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700/60 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50 sticky top-0 bg-gray-900 z-10">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-sky-400" />
                {editingId ? 'Editar servicio' : 'Nuevo servicio en USD'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Preset rápido */}
              {!editingId && (
                <div>
                  <button
                    onClick={() => setUsePreset(!usePreset)}
                    className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {usePreset ? 'Ocultar' : 'Usar servicio predefinido'}
                  </button>
                  {usePreset && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                      {SERVICIOS_PRESET.map(p => (
                        <button key={p.nombre}
                          onClick={() => applyPreset(p)}
                          className="text-left text-xs px-2.5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-sky-500/50 text-gray-300 hover:text-white transition-all">
                          <div className="font-medium">{p.nombre}</div>
                          <div className="text-gray-500 text-[10px]">{p.categoria}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Nombre del servicio *</label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="ej: Chat GPT Plus"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Categoría *</label>
                <select
                  value={form.categoria}
                  onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">Seleccionar categoría...</option>
                  {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </select>
              </div>

              {/* Monto USD y dólar blue */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Monto en USD *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">USD</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.monto_usd}
                      onChange={e => setForm(f => ({ ...f, monto_usd: e.target.value }))}
                      placeholder="0.00"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Dólar blue (ARS) *
                    {dolarBlue > 0 && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, dolar_blue_referencia: dolarBlue.toString() }))}
                        className="ml-1.5 text-sky-400 hover:text-sky-300 underline text-[10px]"
                      >
                        usar {dolarBlue.toLocaleString('es-AR')}
                      </button>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.dolar_blue_referencia}
                      onChange={e => setForm(f => ({ ...f, dolar_blue_referencia: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Equivalente ARS calculado */}
              {form.monto_usd && form.dolar_blue_referencia && (
                <div className="bg-sky-900/20 border border-sky-700/30 rounded-lg px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-sky-400">Equivalente en ARS</span>
                  <span className="text-sm font-bold text-sky-300">
                    {formatARS(calcARS(form.monto_usd, form.dolar_blue_referencia))}
                  </span>
                </div>
              )}

              {/* Proyecto + Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Proyecto</label>
                  <select
                    value={form.proyecto}
                    onChange={e => setForm(f => ({ ...f, proyecto: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    {PROYECTOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Periodicidad + Estado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Periodicidad</label>
                  <select
                    value={form.periodicidad}
                    onChange={e => setForm(f => ({ ...f, periodicidad: e.target.value as any }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    {PERIODICIDADES.map(p => <option key={p} value={p}>{capitalize(p)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Estado</label>
                  <select
                    value={form.estado}
                    onChange={e => setForm(f => ({ ...f, estado: e.target.value as any }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    {ESTADOS.map(e => <option key={e} value={e}>{capitalize(e)}</option>)}
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Descripción (opcional)</label>
                <input
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Detalle del servicio..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">URL del servicio (opcional)</label>
                <input
                  value={form.url_servicio}
                  onChange={e => setForm(f => ({ ...f, url_servicio: e.target.value }))}
                  placeholder="https://..."
                  type="url"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Notas (opcional)</label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Observaciones..."
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : <><Check className="w-4 h-4" />{editingId ? 'Guardar cambios' : 'Crear servicio'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal categorías */}
      {showCategoriaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700/60 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Tag className="w-4 h-4 text-sky-400" />
                Categorías de servicios
              </h3>
              <button onClick={() => setShowCategoriaModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {categorias.map(c => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 rounded-lg">
                    <CategoriaIcon categoria={c.nombre} className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="text-sm text-gray-300">{c.nombre}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-gray-700/50">
                <label className="block text-xs text-gray-400 mb-2">Agregar nueva categoría</label>
                <div className="flex gap-2">
                  <input
                    value={nuevaCategoria}
                    onChange={e => setNuevaCategoria(e.target.value)}
                    placeholder="Nombre de categoría..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
                    onKeyDown={e => e.key === 'Enter' && handleAddCategoria()}
                  />
                  <button
                    onClick={handleAddCategoria}
                    disabled={savingCategoria || !nuevaCategoria.trim()}
                    className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm transition-all disabled:opacity-50"
                  >
                    {savingCategoria ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Subcomponentes ─── */
function CategoriaIcon({ categoria, className }: { categoria: string; className?: string }) {
  const Comp = ICONOS_CATEGORIA[categoria] || Circle;
  return <Comp className={className} />;
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    activo: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    cancelado: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
    vencido: 'bg-red-400/10 text-red-400 border-red-400/20',
  };
  const icons: Record<string, React.ReactNode> = {
    activo: <CheckCircle2 className="w-3 h-3" />,
    cancelado: <Ban className="w-3 h-3" />,
    vencido: <Clock className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${map[estado] || map.activo}`}>
      {icons[estado]}{capitalize(estado)}
    </span>
  );
}

function PeriodicidadBadge({ p }: { p: string }) {
  const map: Record<string, string> = {
    mensual: 'bg-sky-400/10 text-sky-400',
    anual: 'bg-amber-400/10 text-amber-400',
    unico: 'bg-gray-400/10 text-gray-400',
    otro: 'bg-gray-400/10 text-gray-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${map[p] || map.otro}`}>
      {capitalize(p)}
    </span>
  );
}

function FilterSelect({ value, onChange, options, icon, accentColor = 'emerald' }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; icon?: React.ReactNode; accentColor?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`bg-gray-900/60 border border-gray-700 rounded-lg pl-7 pr-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-${accentColor}-500 appearance-none cursor-pointer`}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {icon && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">{icon}</span>}
    </div>
  );
}

/* ─── Helpers ─── */
function formatUSD(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function formatARS(n: number) {
  return '$ ' + new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function formatFecha(f: string) {
  const d = new Date(f + 'T00:00:00');
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
