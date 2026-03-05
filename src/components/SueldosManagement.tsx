import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Check,
  AlertCircle, CheckCircle2, Clock, Ban, DollarSign, TrendingUp,
  FileText, ChevronDown, ChevronUp, Loader2, ClipboardList,
  Banknote, PlusCircle, MinusCircle, Eye, Calendar, User,
  BarChart3, ArrowUpCircle, Wallet, ExternalLink, Search
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const USUARIOS = ['Tobi', 'Max', 'Alexis', 'Maxi', 'Lucila'];
const MESES_NOMBRES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

async function syncGastoFromSueldo(periodo: SueldoPeriodo, creado_por: string) {
  const fecha = periodo.fecha_pago
    ? periodo.fecha_pago
    : `${periodo.anio}-${periodo.mes.toString().padStart(2, '0')}-01`;

  const payload = {
    tipo: 'egreso',
    categoria: 'Sueldos',
    descripcion: `Sueldo ${periodo.usuario} — ${MESES_NOMBRES[periodo.mes - 1]} ${periodo.anio}`,
    monto: periodo.monto_total,
    moneda: 'ARS',
    fecha,
    proyecto: 'Copa bplay',
    notas: periodo.notas || null,
    creado_por,
    sueldo_periodo_id: periodo.id,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from('gastos')
    .select('id')
    .eq('sueldo_periodo_id', periodo.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('gastos').update(payload).eq('id', existing.id);
  } else {
    await supabase.from('gastos').insert(payload);
  }
}

async function deleteGastoFromSueldo(periodoId: string) {
  await supabase.from('gastos').delete().eq('sueldo_periodo_id', periodoId);
}

interface Tarea {
  id: number;
  uuid_publico: string | null;
  nombre_tarea: string;
  descripcion_tarea: string;
  estado: string;
  fecha_cierre: string | null;
  asignada_a: string | string[];
  proyecto: string;
  prioridad: string;
}

interface SueldoPeriodo {
  id: string;
  usuario: string;
  anio: number;
  mes: number;
  monto_base: number;
  monto_bonos: number;
  monto_descuentos: number;
  monto_total: number;
  estado: 'pendiente' | 'pagado' | 'cancelado';
  fecha_pago: string | null;
  notas: string | null;
  creado_por: string;
  created_at: string;
}

interface SueldoItem {
  id: string;
  periodo_id: string;
  tipo: 'tarea' | 'bono' | 'descuento' | 'base';
  descripcion: string;
  tarea_id: number | null;
  monto: number;
}

type Vista = 'listado' | 'detalle' | 'nuevo';

export default function SueldosManagement({ currentUser }: { currentUser: string }) {
  const [vista, setVista] = useState<Vista>('listado');
  const [periodos, setPeriodos] = useState<SueldoPeriodo[]>([]);
  const [items, setItems] = useState<Record<string, SueldoItem[]>>({});
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<SueldoPeriodo | null>(null);
  const [filterUsuario, setFilterUsuario] = useState<string>('todos');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [filterPeriodo, setFilterPeriodo] = useState<string>('todos');
  const [filterMesAnioMes, setFilterMesAnioMes] = useState<number>(new Date().getMonth() + 1);
  const [filterMesAnioAnio, setFilterMesAnioAnio] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: pData }, { data: tData }] = await Promise.all([
      supabase.from('sueldo_periodos').select('*').order('anio', { ascending: false }).order('mes', { ascending: false }),
      supabase.from('tareas').select('id, uuid_publico, nombre_tarea, descripcion_tarea, estado, fecha_cierre, asignada_a, proyecto, prioridad').order('fecha_cierre', { ascending: false })
    ]);
    if (pData) setPeriodos(pData);
    if (tData) setTareas(tData);
    setLoading(false);
  }

  async function fetchItemsPeriodo(periodoId: string) {
    if (items[periodoId]) return;
    const { data } = await supabase.from('sueldo_items').select('*').eq('periodo_id', periodoId).order('tipo');
    if (data) setItems(prev => ({ ...prev, [periodoId]: data }));
  }

  function getTareasUsuarioMes(usuario: string, anio: number, mes: number): Tarea[] {
    return tareas.filter(t => {
      const asignados = Array.isArray(t.asignada_a) ? t.asignada_a : [t.asignada_a];
      if (!asignados.includes(usuario)) return false;
      if (!t.fecha_cierre) return false;
      const fecha = new Date(t.fecha_cierre);
      return fecha.getFullYear() === anio && fecha.getMonth() + 1 === mes;
    });
  }

  function getTareasUsuarioPendientes(usuario: string): Tarea[] {
    return tareas.filter(t => {
      const asignados = Array.isArray(t.asignada_a) ? t.asignada_a : [t.asignada_a];
      return asignados.includes(usuario) && t.estado !== 'resuelta';
    });
  }

  const periodosFiltrados = useMemo(() => {
    const ahora = new Date();
    return periodos.filter(p => {
      if (filterUsuario !== 'todos' && p.usuario !== filterUsuario) return false;
      if (filterEstado !== 'todos' && p.estado !== filterEstado) return false;
      if (filterPeriodo === 'mesanio') {
        if (p.anio !== filterMesAnioAnio || p.mes !== filterMesAnioMes) return false;
      } else if (filterPeriodo === 'ultimos3' || filterPeriodo === 'ultimos6' || filterPeriodo === 'ultimos12') {
        const meses = filterPeriodo === 'ultimos3' ? 3 : filterPeriodo === 'ultimos6' ? 6 : 12;
        const limite = new Date(ahora.getFullYear(), ahora.getMonth() - meses + 1, 1);
        const fechaPeriodo = new Date(p.anio, p.mes - 1, 1);
        if (fechaPeriodo < limite) return false;
      }
      return true;
    });
  }, [periodos, filterUsuario, filterEstado, filterPeriodo, filterMesAnioMes, filterMesAnioAnio]);

  const metricas = useMemo(() => {
    const anioActual = new Date().getFullYear();
    const delAnio = periodos.filter(p => p.anio === anioActual);
    const totalPagado = delAnio.filter(p => p.estado === 'pagado').reduce((s, p) => s + p.monto_total, 0);
    const totalPendiente = delAnio.filter(p => p.estado === 'pendiente').reduce((s, p) => s + p.monto_total, 0);
    const porUsuario = USUARIOS.map(u => ({
      usuario: u,
      total: delAnio.filter(p => p.usuario === u && p.estado === 'pagado').reduce((s, p) => s + p.monto_total, 0)
    })).filter(x => x.total > 0);
    return { totalPagado, totalPendiente, porUsuario };
  }, [periodos]);

  function abrirDetalle(p: SueldoPeriodo) {
    setPeriodoSeleccionado(p);
    fetchItemsPeriodo(p.id);
    setVista('detalle');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Banknote className="w-7 h-7 text-emerald-400" />
            Gestión de Sueldos
          </h2>
          <p className="text-gray-400 text-sm mt-1">Liquidaciones mensuales del equipo — Pesos Argentinos</p>
        </div>
        {vista === 'listado' && (
          <button
            onClick={() => setVista('nuevo')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-emerald-900/30"
          >
            <Plus className="w-4 h-4" />
            Nueva liquidación
          </button>
        )}
        {vista !== 'listado' && (
          <button
            onClick={() => { setVista('listado'); setPeriodoSeleccionado(null); }}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver
          </button>
        )}
      </div>

      {vista === 'listado' && (
        <ListadoView
          periodosFiltrados={periodosFiltrados}
          periodos={periodos}
          metricas={metricas}
          filterUsuario={filterUsuario}
          setFilterUsuario={setFilterUsuario}
          filterEstado={filterEstado}
          setFilterEstado={setFilterEstado}
          filterPeriodo={filterPeriodo}
          setFilterPeriodo={setFilterPeriodo}
          filterMesAnioMes={filterMesAnioMes}
          setFilterMesAnioMes={setFilterMesAnioMes}
          filterMesAnioAnio={filterMesAnioAnio}
          setFilterMesAnioAnio={setFilterMesAnioAnio}
          onVerDetalle={abrirDetalle}
          onRefresh={fetchAll}
          getTareasUsuarioMes={getTareasUsuarioMes}
        />
      )}

      {vista === 'nuevo' && (
        <NuevoLiquidacionView
          currentUser={currentUser}
          tareas={tareas}
          periodos={periodos}
          getTareasUsuarioMes={getTareasUsuarioMes}
          getTareasUsuarioPendientes={getTareasUsuarioPendientes}
          onGuardar={async () => { await fetchAll(); setVista('listado'); }}
          onCancelar={() => setVista('listado')}
        />
      )}

      {vista === 'detalle' && periodoSeleccionado && (
        <DetalleLiquidacionView
          periodo={periodoSeleccionado}
          items={items[periodoSeleccionado.id] || []}
          tareas={tareas}
          getTareasUsuarioMes={getTareasUsuarioMes}
          onActualizar={async (updated) => {
            await fetchAll();
            setPeriodoSeleccionado(updated);
          }}
          onEliminar={async () => { await fetchAll(); setVista('listado'); }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

/* ─── Listado ─── */
function ListadoView({ periodosFiltrados, periodos, metricas, filterUsuario, setFilterUsuario, filterEstado, setFilterEstado, filterPeriodo, setFilterPeriodo, filterMesAnioMes, setFilterMesAnioMes, filterMesAnioAnio, setFilterMesAnioAnio, onVerDetalle, onRefresh, getTareasUsuarioMes }: any) {
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [marcando, setMarcando] = useState<string | null>(null);

  const totalPages = Math.ceil(periodosFiltrados.length / PAGE_SIZE);
  const paginados = periodosFiltrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const aniosOpc = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  function resetPage() { setPage(1); }

  async function marcarPagado(p: SueldoPeriodo) {
    setMarcando(p.id);
    const hoy = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('sueldo_periodos')
      .update({ estado: 'pagado', fecha_pago: hoy, updated_at: new Date().toISOString() })
      .eq('id', p.id)
      .select()
      .maybeSingle();
    if (data) await syncGastoFromSueldo(data, 'sistema');
    setMarcando(null);
    onRefresh();
  }

  return (
    <div className="space-y-5">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Pagado este año</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{formatARS(metricas.totalPagado)}</div>
        </div>
        <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Pendiente de pago</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400">{formatARS(metricas.totalPendiente)}</div>
        </div>
        <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Liquidaciones totales</span>
            <FileText className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-sky-400">{periodos.length}</div>
        </div>
      </div>

      {/* Gráfico por usuario */}
      {metricas.porUsuario.length > 0 && (
        <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            Pagado por usuario — {new Date().getFullYear()}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metricas.porUsuario} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="usuario" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={v => formatARSShort(v)} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                formatter={(v: number) => [formatARS(v), 'Total pagado']}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {metricas.porUsuario.map((_: any, i: number) => (
                  <Cell key={i} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#06b6d4'][i % 5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-700/50 flex flex-wrap gap-2 items-center">
          <FilterSelect
            value={filterUsuario}
            onChange={(v) => { setFilterUsuario(v); resetPage(); }}
            options={[{ value: 'todos', label: 'Todos los usuarios' }, ...USUARIOS.map(u => ({ value: u, label: u }))]}
            icon={<User className="w-3.5 h-3.5" />}
          />
          <FilterSelect
            value={filterEstado}
            onChange={(v) => { setFilterEstado(v); resetPage(); }}
            options={[
              { value: 'todos', label: 'Todos los estados' },
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'pagado', label: 'Pagado' },
              { value: 'cancelado', label: 'Cancelado' },
            ]}
            icon={<Clock className="w-3.5 h-3.5" />}
          />
          <div className="w-px h-5 bg-gray-700 mx-1" />
          <FilterSelect
            value={filterPeriodo}
            onChange={(v) => { setFilterPeriodo(v); resetPage(); }}
            options={[
              { value: 'todos', label: 'Todos los períodos' },
              { value: 'ultimos3', label: 'Últimos 3 meses' },
              { value: 'ultimos6', label: 'Últimos 6 meses' },
              { value: 'ultimos12', label: 'Últimos 12 meses' },
              { value: 'mesanio', label: 'Mes y año específico' },
            ]}
            icon={<Calendar className="w-3.5 h-3.5" />}
          />
          {filterPeriodo === 'mesanio' && (
            <div className="flex items-center gap-1.5">
              <select
                value={filterMesAnioMes}
                onChange={e => { setFilterMesAnioMes(Number(e.target.value)); resetPage(); }}
                className="bg-gray-900/60 border border-emerald-500/40 rounded-lg px-2 py-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {MESES_NOMBRES.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={filterMesAnioAnio}
                onChange={e => { setFilterMesAnioAnio(Number(e.target.value)); resetPage(); }}
                className="bg-gray-900/60 border border-emerald-500/40 rounded-lg px-2 py-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {aniosOpc.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          )}
          <span className="text-xs text-gray-500 self-center ml-auto">{periodosFiltrados.length} liquidación{periodosFiltrados.length !== 1 ? 'es' : ''}</span>
        </div>

        {periodosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Banknote className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Sin liquidaciones para mostrar</p>
            <p className="text-xs mt-1">Crea la primera con el botón "Nueva liquidación"</p>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Usuario</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Período</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Base</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Bonos</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Descuentos</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Total</th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium">Estado</th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginados.map((p: SueldoPeriodo) => (
                  <tr key={p.id} className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400">
                          {p.usuario[0]}
                        </div>
                        <span className="text-white font-medium">{p.usuario}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {MESES_NOMBRES[p.mes - 1]} {p.anio}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{formatARS(p.monto_base)}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{p.monto_bonos > 0 ? '+' + formatARS(p.monto_bonos) : '-'}</td>
                    <td className="px-4 py-3 text-right text-red-400">{p.monto_descuentos > 0 ? '-' + formatARS(p.monto_descuentos) : '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-white">{formatARS(p.monto_total)}</td>
                    <td className="px-4 py-3 text-center">
                      <EstadoBadge estado={p.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {p.estado === 'pendiente' && (
                          <button
                            onClick={() => marcarPagado(p)}
                            disabled={marcando === p.id}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-all disabled:opacity-50 border border-emerald-500/20"
                            title="Pago Realizado"
                          >
                            {marcando === p.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <CheckCircle2 className="w-3.5 h-3.5" />
                            }
                            <span>Pago realizado</span>
                          </button>
                        )}
                        <button
                          onClick={() => onVerDetalle(p)}
                          className="p-1.5 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-700/50 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Página {page} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${n === page ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Nueva Liquidación ─── */
function NuevoLiquidacionView({ currentUser, tareas, periodos, getTareasUsuarioMes, getTareasUsuarioPendientes, onGuardar, onCancelar }: any) {
  const [usuario, setUsuario] = useState(USUARIOS[0]);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [montoBase, setMontoBase] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [verTareas, setVerTareas] = useState(false);

  const tareasDelMes = getTareasUsuarioMes(usuario, anio, mes);
  const tareasPendientes = getTareasUsuarioPendientes(usuario);

  const totalFinal = Number(montoBase) || 0;

  const yaExiste = periodos.some((p: SueldoPeriodo) => p.usuario === usuario && p.anio === anio && p.mes === mes);

  async function handleGuardar() {
    if (yaExiste) { setError('Ya existe una liquidación para ese usuario/mes/año.'); return; }
    if (!montoBase || isNaN(Number(montoBase)) || Number(montoBase) < 0) { setError('El monto base es obligatorio y debe ser mayor o igual a cero.'); return; }

    setSaving(true);
    setError('');

    const payload = {
      usuario,
      anio,
      mes,
      monto_base: Number(montoBase),
      monto_bonos: 0,
      monto_descuentos: 0,
      monto_total: totalFinal,
      estado: 'pendiente',
      notas: notas.trim() || null,
      creado_por: currentUser,
      updated_at: new Date().toISOString(),
    };

    const { data: periodo, error: err } = await supabase.from('sueldo_periodos').insert(payload).select().maybeSingle();
    if (err || !periodo) { setError('Error al guardar. Intenta nuevamente.'); setSaving(false); return; }

    const itemsPayload = [
      { periodo_id: periodo.id, tipo: 'base', descripcion: 'Sueldo base', tarea_id: null, monto: Number(montoBase) },
      ...tareasDelMes.map((t: Tarea) => ({
        periodo_id: periodo.id, tipo: 'tarea', descripcion: t.nombre_tarea, tarea_id: t.id, monto: 0
      })),
    ];

    await supabase.from('sueldo_items').insert(itemsPayload);
    await syncGastoFromSueldo(periodo, currentUser);
    setSaving(false);
    await onGuardar();
  }

  const aniosOpc = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-5">
      {/* Selector usuario / período */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-400" />
          Empleado y período
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Usuario</label>
            <select
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {USUARIOS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Mes</label>
            <select
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {MESES_NOMBRES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Año</label>
            <select
              value={anio}
              onChange={e => setAnio(Number(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {aniosOpc.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        {yaExiste && (
          <div className="mt-3 flex items-center gap-2 text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Ya existe una liquidación para {usuario} en {MESES_NOMBRES[mes - 1]} {anio}.
          </div>
        )}
      </div>

      {/* Tareas del mes */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-5">
        <button
          onClick={() => setVerTareas(!verTareas)}
          className="w-full flex items-center justify-between text-white font-semibold"
        >
          <span className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-sky-400" />
            Tareas cerradas en {MESES_NOMBRES[mes - 1]} {anio} — {tareasDelMes.length} tarea{tareasDelMes.length !== 1 ? 's' : ''}
          </span>
          {verTareas ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {verTareas && (
          <div className="mt-3 space-y-1.5">
            {tareasDelMes.length === 0 ? (
              <p className="text-gray-500 text-sm py-3 text-center">Sin tareas cerradas ese mes para {usuario}</p>
            ) : (
              tareasDelMes.map((t: Tarea) => (
                <div key={t.id} className="flex items-start gap-2 bg-gray-900/40 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-white">{t.nombre_tarea}</span>
                      {t.uuid_publico && (
                        <a href={`/tarea/${t.uuid_publico}`} target="_blank" rel="noopener noreferrer"
                          className="text-sky-500 hover:text-sky-400 transition-colors shrink-0" title="Ver tarea">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{t.proyecto} · {formatFecha(t.fecha_cierre!)}</div>
                  </div>
                  <PrioridadBadge prioridad={t.prioridad} />
                </div>
              ))
            )}
            {tareasPendientes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700/50">
                <p className="text-xs text-amber-400 mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {tareasPendientes.length} tarea{tareasPendientes.length !== 1 ? 's' : ''} pendiente{tareasPendientes.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Monto base */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" />
          Composición del sueldo
        </h3>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-1">Sueldo base (ARS) *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
            <input
              type="number"
              min="0"
              step="100"
              value={montoBase}
              onChange={e => setMontoBase(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-7 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Resumen */}
        <div className="bg-gray-900/60 rounded-lg border border-gray-700/50 p-4">
          <div className="flex justify-between font-bold text-white">
            <span>Total a pagar</span>
            <span className="text-emerald-400 text-lg">{formatARS(totalFinal)}</span>
          </div>
        </div>
      </div>

      {/* Notas */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-5">
        <label className="block text-xs font-medium text-gray-400 mb-2">Notas (opcional)</label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          placeholder="Observaciones sobre esta liquidación..."
          rows={2}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCancelar}
          className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm font-medium transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          disabled={saving || yaExiste}
          className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : <><Check className="w-4 h-4" />Crear liquidación</>}
        </button>
      </div>
    </div>
  );
}

/* ─── Detalle ─── */
function DetalleLiquidacionView({ periodo, items, tareas, getTareasUsuarioMes, onActualizar, onEliminar, currentUser }: any) {
  const [editandoMonto, setEditandoMonto] = useState(false);
  const [nuevoBase, setNuevoBase] = useState(periodo.monto_base.toString());
  const [guardandoMonto, setGuardandoMonto] = useState(false);
  const [marcandoPago, setMarcandoPago] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [error, setError] = useState('');
  const [editNotas, setEditNotas] = useState(false);
  const [notas, setNotas] = useState(periodo.notas || '');

  const tareasDelMes = getTareasUsuarioMes(periodo.usuario, periodo.anio, periodo.mes);
  const itemsBase = items.filter((i: SueldoItem) => i.tipo === 'base');
  const itemsTarea = items.filter((i: SueldoItem) => i.tipo === 'tarea');
  const itemsBono = items.filter((i: SueldoItem) => i.tipo === 'bono');
  const itemsDesc = items.filter((i: SueldoItem) => i.tipo === 'descuento');

  async function marcarPagado() {
    setMarcandoPago(true);
    const hoy = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('sueldo_periodos')
      .update({ estado: 'pagado', fecha_pago: hoy, updated_at: new Date().toISOString() })
      .eq('id', periodo.id)
      .select()
      .maybeSingle();
    if (data) {
      await syncGastoFromSueldo(data, currentUser);
      onActualizar(data);
    }
    setMarcandoPago(false);
  }

  async function marcarPendiente() {
    setMarcandoPago(true);
    const { data } = await supabase
      .from('sueldo_periodos')
      .update({ estado: 'pendiente', fecha_pago: null, updated_at: new Date().toISOString() })
      .eq('id', periodo.id)
      .select()
      .maybeSingle();
    if (data) {
      await syncGastoFromSueldo(data, currentUser);
      onActualizar(data);
    }
    setMarcandoPago(false);
  }

  async function guardarMontoEditado() {
    const base = Number(nuevoBase);
    if (isNaN(base) || base < 0) { setError('Monto inválido'); return; }
    setGuardandoMonto(true);
    setError('');

    const totalBonos = itemsBono.reduce((s: number, i: SueldoItem) => s + i.monto, 0);
    const totalDesc = itemsDesc.reduce((s: number, i: SueldoItem) => s + i.monto, 0);
    const total = base + totalBonos - totalDesc;

    await supabase.from('sueldo_periodos').update({
      monto_base: base,
      monto_bonos: totalBonos,
      monto_descuentos: totalDesc,
      monto_total: total,
      updated_at: new Date().toISOString(),
    }).eq('id', periodo.id);

    const itemsBaseList = items.filter((i: SueldoItem) => i.tipo === 'base');
    if (itemsBaseList.length > 0) {
      await supabase.from('sueldo_items').update({ monto: base }).eq('id', itemsBaseList[0].id);
    }

    setGuardandoMonto(false);
    setEditandoMonto(false);
    const { data } = await supabase.from('sueldo_periodos').select('*').eq('id', periodo.id).maybeSingle();
    if (data) {
      await syncGastoFromSueldo(data, currentUser);
      onActualizar(data);
    }
  }

  async function guardarNotas() {
    await supabase.from('sueldo_periodos').update({ notas: notas.trim() || null }).eq('id', periodo.id);
    setEditNotas(false);
    const { data } = await supabase.from('sueldo_periodos').select('*').eq('id', periodo.id).maybeSingle();
    if (data) {
      await syncGastoFromSueldo(data, currentUser);
      onActualizar(data);
    }
  }

  async function eliminarLiquidacion() {
    setEliminando(true);
    await deleteGastoFromSueldo(periodo.id);
    await supabase.from('sueldo_periodos').delete().eq('id', periodo.id);
    setEliminando(false);
    onEliminar();
  }

  return (
    <div className="space-y-5">
      {/* Header detalle */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-xl font-bold text-emerald-400">
              {periodo.usuario[0]}
            </div>
            <div>
              <div className="text-xl font-bold text-white">{periodo.usuario}</div>
              <div className="text-gray-400 text-sm">{MESES_NOMBRES[periodo.mes - 1]} {periodo.anio}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <EstadoBadge estado={periodo.estado} />
            {periodo.estado === 'pendiente' && (
              <button
                onClick={marcarPagado}
                disabled={marcandoPago}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Marcar pagado
              </button>
            )}
            {periodo.estado === 'pagado' && (
              <button
                onClick={marcarPendiente}
                disabled={marcandoPago}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                Revertir a pendiente
              </button>
            )}
          </div>
        </div>
        {periodo.fecha_pago && (
          <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Pagado el {formatFecha(periodo.fecha_pago)}
          </div>
        )}
      </div>

      {/* Monto */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Composición del pago
          </h3>
          {!editandoMonto && (
            <button
              onClick={() => setEditandoMonto(true)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Editar
            </button>
          )}
        </div>

        <div className="space-y-2">
          <ItemRow label="Sueldo base" monto={periodo.monto_base} tipo="base"
            editando={editandoMonto} value={nuevoBase} onChange={setNuevoBase} />
          {itemsBono.map((i: SueldoItem) => (
            <ItemRow key={i.id} label={i.descripcion} monto={i.monto} tipo="bono" />
          ))}
          {itemsDesc.map((i: SueldoItem) => (
            <ItemRow key={i.id} label={i.descripcion} monto={i.monto} tipo="descuento" />
          ))}


          <div className="border-t border-gray-700/50 pt-3 mt-3 flex justify-between font-bold">
            <span className="text-gray-300">Total</span>
            <span className="text-emerald-400 text-xl">{formatARS(periodo.monto_total)}</span>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {editandoMonto && (
          <div className="flex gap-2 mt-4">
            <button onClick={() => { setEditandoMonto(false); setError(''); }}
              className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-all">
              Cancelar
            </button>
            <button onClick={guardarMontoEditado} disabled={guardandoMonto}
              className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {guardandoMonto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Guardar cambios
            </button>
          </div>
        )}
      </div>

      {/* Tareas del período */}
      <TareasDetalle
        tareas={tareas}
        usuario={periodo.usuario}
        anio={periodo.anio}
        mes={periodo.mes}
        getTareasUsuarioMes={getTareasUsuarioMes}
      />

      {/* Notas */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            Notas
          </h3>
          {!editNotas && (
            <button onClick={() => setEditNotas(true)} className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1">
              <Pencil className="w-3 h-3" />Editar
            </button>
          )}
        </div>
        {editNotas ? (
          <div className="space-y-2">
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setEditNotas(false)} className="flex-1 py-1.5 rounded-lg border border-gray-700 text-gray-400 text-xs transition-all hover:border-gray-600">Cancelar</button>
              <button onClick={guardarNotas} className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs transition-all">Guardar</button>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">{periodo.notas || 'Sin notas.'}</p>
        )}
      </div>

      {/* Eliminar */}
      <div className="bg-red-900/10 rounded-xl border border-red-700/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-400 font-medium text-sm">Eliminar liquidación</p>
            <p className="text-gray-500 text-xs mt-0.5">Esta acción no se puede deshacer</p>
          </div>
          {!confirmEliminar ? (
            <button
              onClick={() => setConfirmEliminar(true)}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-lg transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirmEliminar(false)} className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
              <button onClick={eliminarLiquidacion} disabled={eliminando} className="flex items-center gap-1 p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50">
                {eliminando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Tareas Detalle ─── */
function TareasDetalle({ tareas, usuario, anio, mes, getTareasUsuarioMes }: {
  tareas: Tarea[]; usuario: string; anio: number; mes: number; getTareasUsuarioMes: (u: string, a: number, m: number) => Tarea[];
}) {
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'resuelta' | 'pendiente' | 'en_revision'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_PAG = 10;

  const tareasDelMes = getTareasUsuarioMes(usuario, anio, mes);

  const tareasPendientesYResueltas = tareas.filter(t => {
    const asignados = Array.isArray(t.asignada_a) ? t.asignada_a : [t.asignada_a];
    if (!asignados.includes(usuario)) return false;
    if (t.estado === 'resuelta') return false;
    return true;
  });

  const todasLasTareas: (Tarea & { _seccion: string })[] = [
    ...tareasDelMes.map(t => ({ ...t, _seccion: 'resuelta' })),
    ...tareasPendientesYResueltas.map(t => ({ ...t, _seccion: t.estado })),
  ];

  const contResuelta = tareasDelMes.length;
  const contPendiente = tareasPendientesYResueltas.filter(t => t.estado === 'pendiente').length;
  const contEnRevision = tareasPendientesYResueltas.filter(t => t.estado === 'en_revision').length;

  const filtradas = todasLasTareas.filter(t => {
    if (filtroEstado !== 'todos' && t._seccion !== filtroEstado) return false;
    if (busqueda) {
      const s = busqueda.toLowerCase();
      if (!t.nombre_tarea.toLowerCase().includes(s) && !t.proyecto.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const totalPaginas = Math.ceil(filtradas.length / ITEMS_PAG);
  const inicio = (paginaActual - 1) * ITEMS_PAG;
  const paginadas = filtradas.slice(inicio, inicio + ITEMS_PAG);

  function cambiarFiltro(v: typeof filtroEstado) {
    setFiltroEstado(v);
    setPaginaActual(1);
  }

  function cambiarBusqueda(v: string) {
    setBusqueda(v);
    setPaginaActual(1);
  }

  const estadoIcono = (seccion: string) => {
    if (seccion === 'resuelta') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />;
    if (seccion === 'en_revision') return <Eye className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />;
    return <Clock className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />;
  };

  const estadoLabel = (seccion: string) => {
    if (seccion === 'resuelta') return 'Cerrada';
    if (seccion === 'en_revision') return 'En revisión';
    return 'Pendiente';
  };

  const estadoColor = (seccion: string) => {
    if (seccion === 'resuelta') return 'text-emerald-400';
    if (seccion === 'en_revision') return 'text-amber-400';
    return 'text-sky-400';
  };

  return (
    <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-sky-400" />
          Tareas de {usuario}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            {contResuelta} cerrada{contResuelta !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-400/10 border border-sky-400/20 text-xs font-medium text-sky-400">
            <Clock className="w-3 h-3" />
            {contPendiente} pendiente{contPendiente !== 1 ? 's' : ''}
          </span>
          {contEnRevision > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-400/10 border border-amber-400/20 text-xs font-medium text-amber-400">
              <Eye className="w-3 h-3" />
              {contEnRevision} en revisión
            </span>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            value={busqueda}
            onChange={e => cambiarBusqueda(e.target.value)}
            placeholder="Buscar tarea o proyecto..."
            className="w-full bg-gray-900/60 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-1 bg-gray-900/60 rounded-lg p-1 border border-gray-700">
          {([
            { val: 'todos', label: 'Todas', count: todasLasTareas.length },
            { val: 'resuelta', label: 'Cerradas', count: contResuelta },
            { val: 'pendiente', label: 'Pendientes', count: contPendiente },
            { val: 'en_revision', label: 'En revisión', count: contEnRevision },
          ] as { val: typeof filtroEstado; label: string; count: number }[]).map(opt => (
            <button
              key={opt.val}
              onClick={() => cambiarFiltro(opt.val)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                filtroEstado === opt.val
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {opt.label}
              <span className={`text-xs px-1 rounded ${filtroEstado === opt.val ? 'bg-emerald-700 text-emerald-200' : 'bg-gray-700 text-gray-500'}`}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-600 mb-2">{filtradas.length} tarea{filtradas.length !== 1 ? 's' : ''}</div>

      {filtradas.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">Sin tareas para mostrar</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {paginadas.map((t) => (
              <div key={`${t.id}-${t._seccion}`} className="flex items-start gap-2 bg-gray-900/40 rounded-lg px-3 py-2">
                {estadoIcono(t._seccion)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm text-white">{t.nombre_tarea}</span>
                    {t.uuid_publico && (
                      <a href={`/tarea/${t.uuid_publico}`} target="_blank" rel="noopener noreferrer"
                        className="text-sky-500 hover:text-sky-400 transition-colors shrink-0" title="Ver tarea">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <span className={`text-xs font-medium ${estadoColor(t._seccion)}`}>
                      {estadoLabel(t._seccion)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {t.proyecto}
                    {t.fecha_cierre && t._seccion === 'resuelta' ? ` · Cerrada ${formatFecha(t.fecha_cierre)}` : ''}
                  </div>
                </div>
                <PrioridadBadge prioridad={t.prioridad} />
              </div>
            ))}
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700/50">
              <span className="text-xs text-gray-500">
                {inicio + 1}–{Math.min(inicio + ITEMS_PAG, filtradas.length)} de {filtradas.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPaginaActual(1)}
                  disabled={paginaActual === 1}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                      <span key={`d${idx}`} className="px-1 text-gray-600 text-xs">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPaginaActual(p as number)}
                        className={`min-w-[26px] h-[26px] rounded-lg text-xs font-medium transition-colors ${
                          paginaActual === p ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
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

/* ─── Subcomponentes ─── */
function EstadoBadge({ estado }: { estado: string }) {
  const map = {
    pendiente: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    pagado: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    cancelado: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
  };
  const icons = {
    pendiente: <Clock className="w-3 h-3" />,
    pagado: <CheckCircle2 className="w-3 h-3" />,
    cancelado: <Ban className="w-3 h-3" />,
  };
  const labels = { pendiente: 'Pendiente', pagado: 'Pagado', cancelado: 'Cancelado' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${map[estado as keyof typeof map] || map.pendiente}`}>
      {icons[estado as keyof typeof icons]}
      {labels[estado as keyof typeof labels] || estado}
    </span>
  );
}

function PrioridadBadge({ prioridad }: { prioridad: string }) {
  if (!prioridad) return null;
  const map: Record<string, string> = {
    alta: 'bg-red-400/10 text-red-400',
    media: 'bg-amber-400/10 text-amber-400',
    baja: 'bg-sky-400/10 text-sky-400',
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${map[prioridad] || 'bg-gray-400/10 text-gray-400'}`}>
      {prioridad}
    </span>
  );
}

function ItemRow({ label, monto, tipo, editando, value, onChange }: {
  label: string; monto: number; tipo: string; editando?: boolean; value?: string; onChange?: (v: string) => void;
}) {
  if (tipo === 'base') {
    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-gray-300 text-sm">{label}</span>
        {editando && onChange ? (
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="number"
              min="0"
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-36 bg-gray-900 border border-gray-700 rounded-lg pl-5 pr-2 py-1.5 text-sm text-right text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        ) : (
          <span className="text-white font-medium text-sm">{formatARS(monto)}</span>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-gray-400 text-sm flex items-center gap-1.5">
        {tipo === 'bono' ? <ArrowUpCircle className="w-3 h-3 text-emerald-400" /> : <MinusCircle className="w-3 h-3 text-red-400" />}
        {label}
      </span>
      <span className={`text-sm font-medium ${tipo === 'bono' ? 'text-emerald-400' : 'text-red-400'}`}>
        {tipo === 'bono' ? '+' : '-'}{formatARS(monto)}
      </span>
    </div>
  );
}

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
function formatARS(n: number) {
  return '$ ' + new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function formatARSShort(n: number) {
  if (Math.abs(n) >= 1_000_000) return '$ ' + (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return '$ ' + (n / 1_000).toFixed(0) + 'k';
  return '$ ' + n;
}
function formatFecha(f: string) {
  const d = new Date(f);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}
