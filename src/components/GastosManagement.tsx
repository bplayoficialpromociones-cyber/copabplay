import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus, Pencil, Trash2, X, Check, TrendingUp, TrendingDown,
  DollarSign, Calendar, Filter, Search, ChevronDown, ChevronUp,
  BarChart3, PieChart, ArrowUpCircle, ArrowDownCircle, Wallet,
  AlertCircle, FileText, Tag, Building2, SlidersHorizontal, Banknote, Lock,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend, Area, AreaChart
} from 'recharts';

interface Gasto {
  id: string;
  tipo: 'ingreso' | 'egreso';
  categoria: string;
  descripcion: string;
  monto: number;
  moneda: 'ARS';
  fecha: string;
  proyecto: string;
  comprobante_url?: string;
  notas?: string;
  creado_por: string;
  created_at: string;
  sueldo_periodo_id?: string | null;
}

const CATEGORIAS_INGRESO = [
  'Sponsoreo', 'Inscripciones', 'Premios recuperados', 'Publicidad', 'Donaciones', 'Otros ingresos'
];

const CATEGORIAS_EGRESO = [
  'Compra de Herramienta IA Opus.pro',
  'Compra de Herramienta IA Chat Gpt',
  'Compra de Herramienta IA Free Pik',
  'Compra de Herramienta IA Bolt',
  'Compra de Herramienta IA Metricool',
  'Compra de dominio',
  'Renovación de dominio',
  'Compra de hosting',
  'Renovación de hosting',
  'Compra de servidor de email',
  'Compra de Ads en Youtube',
  'Compra de Ads en Meta',
  'Compra de Ads en Linkedin',
  'Compra de Ads en X',
  'Pago de premios Copa bplay',
  'Sueldos',
];

const PROYECTOS = ['Copa bplay', 'La Lupa de Tobi'];

const COLORES_PIE = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const emptyForm = {
  tipo: 'egreso' as 'ingreso' | 'egreso',
  categoria: '',
  monto: '',
  moneda: 'ARS' as const,
  fecha: new Date().toISOString().split('T')[0],
  proyecto: 'Copa bplay',
  comprobante_url: '',
  notas: '',
};

export default function GastosManagement({ currentUser }: { currentUser: string }) {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'todos' | 'ingreso' | 'egreso'>('todos');
  const [filterMoneda] = useState<'todos' | 'ARS'>('ARS');
  const [filterProyecto, setFilterProyecto] = useState('todos');
  const [filterMes, setFilterMes] = useState('todos');
  const [filterAnio, setFilterAnio] = useState(new Date().getFullYear().toString());
  const [sortField, setSortField] = useState<'fecha' | 'monto' | 'categoria'>('fecha');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeChart, setActiveChart] = useState<'barras' | 'torta' | 'linea'>('barras');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  useEffect(() => {
    fetchGastos();
  }, []);

  async function fetchGastos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false });
    if (!error && data) setGastos(data);
    setLoading(false);
  }

  const aniosDisponibles = useMemo(() => {
    const set = new Set(gastos.map(g => new Date(g.fecha).getFullYear().toString()));
    set.add(new Date().getFullYear().toString());
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [gastos]);

  const gastosFiltrados = useMemo(() => {
    setPaginaActual(1);
    return gastos.filter(g => {
      const fechaObj = new Date(g.fecha);
      const anioGasto = fechaObj.getFullYear().toString();
      const mesGasto = (fechaObj.getMonth() + 1).toString();

      if (filterTipo !== 'todos' && g.tipo !== filterTipo) return false;
      if (filterMoneda !== 'todos' && g.moneda !== filterMoneda) return false;
      if (filterProyecto !== 'todos' && g.proyecto !== filterProyecto) return false;
      if (filterAnio !== 'todos' && anioGasto !== filterAnio) return false;
      if (filterMes !== 'todos' && mesGasto !== filterMes) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!g.descripcion.toLowerCase().includes(s) &&
          !g.categoria.toLowerCase().includes(s) &&
          !g.proyecto.toLowerCase().includes(s)) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA: string | number = a[sortField];
      let valB: string | number = b[sortField];
      if (sortField === 'monto') {
        valA = Number(valA);
        valB = Number(valB);
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [gastos, filterTipo, filterMoneda, filterProyecto, filterAnio, filterMes, searchTerm, sortField, sortDir]);

  const metricas = useMemo(() => {
    const filtradosPorAnio = gastos.filter(g => {
      if (filterAnio === 'todos') return true;
      return new Date(g.fecha).getFullYear().toString() === filterAnio;
    });

    const totalIngresosARS = filtradosPorAnio.filter(g => g.tipo === 'ingreso').reduce((s, g) => s + g.monto, 0);
    const totalEgresosARS = filtradosPorAnio.filter(g => g.tipo === 'egreso').reduce((s, g) => s + g.monto, 0);
    const totalIngresosUSD = 0;
    const totalEgresosUSD = 0;

    const porCategoria = CATEGORIAS_EGRESO.concat(CATEGORIAS_INGRESO).reduce((acc, cat) => {
      const total = filtradosPorAnio.filter(g => g.categoria === cat).reduce((s, g) => s + g.monto, 0);
      if (total > 0) acc.push({ name: cat, value: total });
      return acc;
    }, [] as { name: string; value: number }[]);

    const porMes = MESES.map((mes, idx) => {
      const mesNum = idx + 1;
      const ingresos = filtradosPorAnio.filter(g => g.tipo === 'ingreso' && new Date(g.fecha).getMonth() + 1 === mesNum).reduce((s, g) => s + g.monto, 0);
      const egresos = filtradosPorAnio.filter(g => g.tipo === 'egreso' && new Date(g.fecha).getMonth() + 1 === mesNum).reduce((s, g) => s + g.monto, 0);
      return { mes, ingresos, egresos, balance: ingresos - egresos };
    });

    return { totalIngresosARS, totalEgresosARS, totalIngresosUSD, totalEgresosUSD, porCategoria, porMes };
  }, [gastos, filterAnio]);

  function toggleSort(field: 'fecha' | 'monto' | 'categoria') {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }

  function openNew() {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
    setShowForm(true);
  }

  function openEdit(g: Gasto) {
    if (g.sueldo_periodo_id) return;
    setForm({
      tipo: g.tipo,
      categoria: g.categoria,
      monto: g.monto.toString(),
      moneda: g.moneda,
      fecha: g.fecha,
      proyecto: g.proyecto,
      comprobante_url: g.comprobante_url || '',
      notas: g.notas || '',
    });
    setEditingId(g.id);
    setError('');
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.categoria) { setError('Selecciona una categoría.'); return; }
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) { setError('El monto debe ser mayor a cero.'); return; }
    if (!form.fecha) { setError('La fecha es obligatoria.'); return; }

    setSaving(true);
    setError('');

    const payload = {
      tipo: form.tipo,
      categoria: form.categoria,
      descripcion: form.categoria,
      monto: Number(form.monto),
      moneda: form.moneda,
      fecha: form.fecha,
      proyecto: form.proyecto,
      comprobante_url: form.comprobante_url.trim() || null,
      notas: form.notas.trim() || null,
      creado_por: currentUser,
      updated_at: new Date().toISOString(),
    };

    let err;
    if (editingId) {
      ({ error: err } = await supabase.from('gastos').update(payload).eq('id', editingId));
    } else {
      ({ error: err } = await supabase.from('gastos').insert(payload));
    }

    if (err) {
      setError('Error al guardar. Intenta nuevamente.');
    } else {
      setShowForm(false);
      setEditingId(null);
      await fetchGastos();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from('gastos').delete().eq('id', id);
    setConfirmDelete(null);
    setDeletingId(null);
    await fetchGastos();
  }

  function formatMonto(monto: number, _moneda?: string) {
    return '$ ' + new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto);
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const categoriasActuales = form.tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-7 h-7 text-emerald-400" />
            Gestión de Gastos
          </h2>
          <p className="text-gray-400 text-sm mt-1">Control de ingresos y egresos del proyecto</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-emerald-900/30"
        >
          <Plus className="w-4 h-4" />
          Nuevo registro
        </button>
      </div>

      {/* Métricas */}
      <MetricasCards metricas={metricas} filterAnio={filterAnio} aniosDisponibles={aniosDisponibles} setFilterAnio={setFilterAnio} />

      {/* Gráficos */}
      <GraficosSection metricas={metricas} activeChart={activeChart} setActiveChart={setActiveChart} filterAnio={filterAnio} />

      {/* Tabla */}
      <TablaGastos
        gastosFiltrados={gastosFiltrados}
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterTipo={filterTipo}
        setFilterTipo={setFilterTipo}
        filterProyecto={filterProyecto}
        setFilterProyecto={setFilterProyecto}
        filterMes={filterMes}
        setFilterMes={setFilterMes}
        filterAnio={filterAnio}
        setFilterAnio={setFilterAnio}
        aniosDisponibles={aniosDisponibles}
        sortField={sortField}
        sortDir={sortDir}
        toggleSort={toggleSort}
        SortIcon={SortIcon}
        onEdit={openEdit}
        onDelete={(id) => setConfirmDelete(id)}
        formatMonto={formatMonto}
        confirmDelete={confirmDelete}
        setConfirmDelete={setConfirmDelete}
        handleDelete={handleDelete}
        deletingId={deletingId}
        paginaActual={paginaActual}
        setPaginaActual={setPaginaActual}
        itemsPorPagina={ITEMS_POR_PAGINA}
      />

      {/* Modal Form */}
      {showForm && (
        <FormModal
          form={form}
          setForm={setForm}
          editingId={editingId}
          error={error}
          saving={saving}
          categoriasActuales={categoriasActuales}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

/* ─── Métricas Cards ─── */
function MetricasCards({ metricas, filterAnio, aniosDisponibles, setFilterAnio }: {
  metricas: any; filterAnio: string; aniosDisponibles: string[]; setFilterAnio: (v: string) => void;
}) {
  const balanceARS = metricas.totalIngresosARS - metricas.totalEgresosARS;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <MetricCard
        label="Ingresos"
        value={'$ ' + formatNum(metricas.totalIngresosARS)}
        icon={<ArrowUpCircle className="w-5 h-5" />}
        color="emerald"
        sub={`Año ${filterAnio} — ARS`}
      />
      <MetricCard
        label="Egresos"
        value={'$ ' + formatNum(metricas.totalEgresosARS)}
        icon={<ArrowDownCircle className="w-5 h-5" />}
        color="red"
        sub={`Año ${filterAnio} — ARS`}
      />
      <MetricCard
        label="Balance"
        value={'$ ' + formatNum(Math.abs(balanceARS))}
        icon={balanceARS >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
        color={balanceARS >= 0 ? 'emerald' : 'red'}
        sub={balanceARS >= 0 ? 'Superavit' : 'Deficit'}
        highlight
      />
    </div>
  );
}

function MetricCard({ label, value, icon, color, sub, highlight }: {
  label: string; value: string; icon: React.ReactNode; color: string; sub?: string; highlight?: boolean;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    red: 'text-red-400 bg-red-400/10 border-red-400/20',
    sky: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  };
  return (
    <div className={`bg-gray-800/60 rounded-xl border p-4 ${highlight ? 'border-gray-600' : 'border-gray-700/50'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm font-medium">{label}</span>
        <span className={`p-1.5 rounded-lg border ${colorMap[color]}`}>{icon}</span>
      </div>
      <div className={`text-xl font-bold ${colorMap[color].split(' ')[0]}`}>{value}</div>
      {sub && <div className="text-gray-500 text-xs mt-1">{sub}</div>}
    </div>
  );
}

/* ─── Gráficos ─── */
function GraficosSection({ metricas, activeChart, setActiveChart, filterAnio }: {
  metricas: any; activeChart: string; setActiveChart: (v: any) => void; filterAnio: string;
}) {
  const chartBtns = [
    { id: 'barras', label: 'Por mes', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'torta', label: 'Por categoría', icon: <PieChart className="w-4 h-4" /> },
    { id: 'linea', label: 'Balance', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          Analíticas — {filterAnio === 'todos' ? 'Todos los años' : filterAnio}
        </h3>
        <div className="flex gap-1 bg-gray-900/60 rounded-lg p-1">
          {chartBtns.map(b => (
            <button
              key={b.id}
              onClick={() => setActiveChart(b.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeChart === b.id ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {b.icon}{b.label}
            </button>
          ))}
        </div>
      </div>

      {activeChart === 'barras' && (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={metricas.porMes} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="mes" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={v => formatNumShort(v)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
              labelStyle={{ color: '#f9fafb', fontWeight: 600 }}
              formatter={(v: number, name: string) => [formatNum(v) + ' ARS', name === 'ingresos' ? 'Ingresos' : 'Egresos']}
            />
            <Legend formatter={(v) => v === 'ingresos' ? 'Ingresos' : 'Egresos'} />
            <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {activeChart === 'torta' && (
        metricas.porCategoria.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">Sin datos para mostrar</div>
        ) : (
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={260}>
              <RechartsPieChart>
                <Pie
                  data={metricas.porCategoria}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {metricas.porCategoria.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(v: number) => [formatNum(v), 'Monto']}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        )
      )}

      {activeChart === 'linea' && (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={metricas.porMes}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="mes" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={v => formatNumShort(v)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
              labelStyle={{ color: '#f9fafb', fontWeight: 600 }}
              formatter={(v: number) => [formatNum(v) + ' ARS', 'Balance']}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#colorBalance)"
              dot={{ fill: '#10b981', r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ─── Tabla ─── */
function TablaGastos({
  gastosFiltrados, loading, searchTerm, setSearchTerm,
  filterTipo, setFilterTipo,
  filterProyecto, setFilterProyecto, filterMes, setFilterMes,
  filterAnio, setFilterAnio, aniosDisponibles,
  sortField, sortDir, toggleSort, SortIcon,
  onEdit, onDelete, formatMonto, confirmDelete, setConfirmDelete, handleDelete, deletingId,
  paginaActual, setPaginaActual, itemsPorPagina
}: any) {
  const totalPaginas = Math.ceil(gastosFiltrados.length / itemsPorPagina);
  const inicio = (paginaActual - 1) * itemsPorPagina;
  const gastosPagina = gastosFiltrados.slice(inicio, inicio + itemsPorPagina);

  return (
    <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Filtros */}
      <div className="p-4 border-b border-gray-700/50 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por descripción, categoría o proyecto..."
              className="w-full bg-gray-900/60 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <FilterSelect value={filterTipo} onChange={setFilterTipo} options={[
              { value: 'todos', label: 'Todos' }, { value: 'ingreso', label: 'Ingresos' }, { value: 'egreso', label: 'Egresos' }
            ]} icon={<SlidersHorizontal className="w-3.5 h-3.5" />} />
            <FilterSelect value={filterProyecto} onChange={setFilterProyecto} options={[
              { value: 'todos', label: 'Proyectos' }, ...PROYECTOS.map(p => ({ value: p, label: p }))
            ]} icon={<Building2 className="w-3.5 h-3.5" />} />
            <FilterSelect value={filterMes} onChange={setFilterMes} options={[
              { value: 'todos', label: 'Meses' }, ...MESES.map((m, i) => ({ value: (i + 1).toString(), label: m }))
            ]} icon={<Calendar className="w-3.5 h-3.5" />} />
            <FilterSelect value={filterAnio} onChange={setFilterAnio} options={[
              { value: 'todos', label: 'Años' }, ...aniosDisponibles.map((a: string) => ({ value: a, label: a }))
            ]} icon={<Filter className="w-3.5 h-3.5" />} />
          </div>
        </div>
        <div className="text-xs text-gray-500">{gastosFiltrados.length} registro{gastosFiltrados.length !== 1 ? 's' : ''}</div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500">Cargando...</div>
      ) : gastosFiltrados.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Sin registros para mostrar</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">
                    <button className="flex items-center gap-1 hover:text-white transition-colors" onClick={() => toggleSort('fecha')}>
                      Fecha <SortIcon field="fecha" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">
                    <button className="flex items-center gap-1 hover:text-white transition-colors" onClick={() => toggleSort('categoria')}>
                      Categoría <SortIcon field="categoria" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Descripción</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Proyecto</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">
                    <button className="flex items-center gap-1 ml-auto hover:text-white transition-colors" onClick={() => toggleSort('monto')}>
                      Monto <SortIcon field="monto" />
                    </button>
                  </th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gastosPagina.map((g: Gasto) => {
                  const esSueldo = !!g.sueldo_periodo_id;
                  return (
                  <tr key={g.id} className={`border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors ${esSueldo ? 'bg-sky-900/10' : ''}`}>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {formatFecha(g.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${g.tipo === 'ingreso' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                        {g.tipo === 'ingreso' ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                        {g.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-gray-300">
                        <Tag className="w-3 h-3 text-gray-500" />
                        {g.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs">
                      <div className="flex items-center gap-2">
                        <div className="truncate" title={g.descripcion}>{g.descripcion}</div>
                        {esSueldo && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-sky-400/10 text-sky-400 border border-sky-400/20 shrink-0">
                            <Banknote className="w-3 h-3" />
                            Sueldo
                          </span>
                        )}
                      </div>
                      {g.notas && <div className="text-xs text-gray-500 truncate">{g.notas}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{g.proyecto}</td>
                    <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${g.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {g.tipo === 'ingreso' ? '+' : '-'}{formatMonto(g.monto, g.moneda)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {esSueldo ? (
                          <span className="flex items-center gap-1 text-xs text-gray-600 px-2 py-1" title="Gestionado desde Sueldos">
                            <Lock className="w-3 h-3" />
                            Sueldos
                          </span>
                        ) : confirmDelete === g.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(g.id)}
                              disabled={deletingId === g.id}
                              className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                              title="Confirmar"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => onEdit(g)}
                              className="p-1.5 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDelete(g.id)}
                              className="p-1.5 hover:bg-red-900/40 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50">
              <span className="text-xs text-gray-500">
                Mostrando {inicio + 1}–{Math.min(inicio + itemsPorPagina, gastosFiltrados.length)} de {gastosFiltrados.length} registros
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPaginaActual(1)}
                  disabled={paginaActual === 1}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Primera página"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 1)
                  .reduce((acc: (number | string)[], p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === '...' ? (
                      <span key={`dots-${idx}`} className="px-1.5 text-gray-600 text-xs">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPaginaActual(p as number)}
                        className={`min-w-[30px] h-[30px] rounded-lg text-xs font-medium transition-colors ${
                          paginaActual === p
                            ? 'bg-emerald-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPaginaActual(totalPaginas)}
                  disabled={paginaActual === totalPaginas}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Última página"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Modal Form ─── */
function FormModal({ form, setForm, editingId, error, saving, categoriasActuales, onClose, onSave }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h3 className="text-white font-semibold text-lg">
            {editingId ? 'Editar registro' : 'Nuevo registro'}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Tipo</label>
            <div className="flex gap-2">
              {(['egreso', 'ingreso'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setForm((f: any) => ({ ...f, tipo: t, categoria: '' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border font-medium text-sm transition-all ${form.tipo === t
                    ? t === 'ingreso'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                      : 'bg-red-600/20 border-red-500 text-red-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                >
                  {t === 'ingreso' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                  {t === 'ingreso' ? 'Ingreso' : 'Egreso'}
                </button>
              ))}
            </div>
          </div>

          {/* Categoría y Proyecto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Categoría *</label>
              <select
                value={form.categoria}
                onChange={e => setForm((f: any) => ({ ...f, categoria: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Seleccionar...</option>
                {categoriasActuales.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Proyecto</label>
              <select
                value={form.proyecto}
                onChange={e => setForm((f: any) => ({ ...f, proyecto: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {PROYECTOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Monto en ARS *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monto}
                onChange={e => setForm((f: any) => ({ ...f, monto: e.target.value }))}
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Fecha *</label>
            <input
              type="date"
              value={form.fecha}
              onChange={e => setForm((f: any) => ({ ...f, fecha: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Notas (opcional)</label>
            <textarea
              value={form.notas}
              onChange={e => setForm((f: any) => ({ ...f, notas: e.target.value }))}
              placeholder="Información adicional..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
        <div className="flex gap-2 p-5 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm font-medium transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? 'Guardando...' : (
              <><Check className="w-4 h-4" />{editingId ? 'Actualizar' : 'Guardar'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── FilterSelect ─── */
function FilterSelect({ value, onChange, options, icon }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-gray-900/60 border border-gray-700 rounded-lg pl-7 pr-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {icon && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">{icon}</span>}
    </div>
  );
}

/* ─── Helpers ─── */
function formatNum(n: number) {
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function formatNumShort(n: number) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'k';
  return n.toString();
}
function formatFecha(f: string) {
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}
