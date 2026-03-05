import { useEffect, useState } from 'react';
import { CheckSquare, MessageSquare, Clock, CheckCircle, FileText, AlertCircle, TrendingUp, User, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface EditorStats {
  totalTareas: number;
  tareasAsignadas: number;
  tareasPendientes: number;
  tareasEnProgreso: number;
  tareasEnRevision: number;
  tareasCompletadas: number;
  tareasCerradas: number;
  totalComentarios: number;
  comentariosNoLeidos: number;
  comentariosRecientes: number;
  archivosSubidos: number;
  tareasCreadas: number;
}

interface TareaReciente {
  id: number;
  nombre_tarea: string;
  estado: string;
  fecha_creacion: string;
  proyecto: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function EditorDashboard({ currentUser }: { currentUser: string }) {
  const [stats, setStats] = useState<EditorStats>({
    totalTareas: 0,
    tareasAsignadas: 0,
    tareasPendientes: 0,
    tareasEnProgreso: 0,
    tareasEnRevision: 0,
    tareasCompletadas: 0,
    tareasCerradas: 0,
    totalComentarios: 0,
    comentariosNoLeidos: 0,
    comentariosRecientes: 0,
    archivosSubidos: 0,
    tareasCreadas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tareasRecientes, setTareasRecientes] = useState<TareaReciente[]>([]);

  useEffect(() => {
    fetchEditorDashboardData();
  }, [currentUser]);

  const fetchEditorDashboardData = async () => {
    try {
      const { data: todasTareas, error: tareasError } = await supabase
        .from('tareas')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (tareasError) throw tareasError;

      const allTareas = todasTareas || [];

      const tareas = allTareas.filter(t => {
        const isAssignedTo = t.asignada_a && Array.isArray(t.asignada_a) && t.asignada_a.includes(currentUser);
        const isCreatedBy = t.creada_por === currentUser;
        return isAssignedTo || isCreatedBy;
      });

      const total = tareas.length;
      const pendientes = tareas.filter(t => t.estado === 'pendiente').length;
      const enRevision = tareas.filter(t => t.estado === 'en revisión').length;
      const completadas = tareas.filter(t => t.estado === 'resuelta').length;
      const cerradas = tareas.filter(t => t.estado === 'con bugs').length;

      let totalArchivos = 0;
      tareas.forEach(tarea => {
        if (tarea.imagen_tarea && Array.isArray(tarea.imagen_tarea)) {
          totalArchivos += tarea.imagen_tarea.length;
        }
        if (tarea.video_tarea && Array.isArray(tarea.video_tarea)) {
          totalArchivos += tarea.video_tarea.length;
        }
      });

      const recientes = [...tareas]
        .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
        .slice(0, 5)
        .map(t => ({
          id: t.id,
          nombre_tarea: t.nombre_tarea,
          estado: t.estado,
          fecha_creacion: t.fecha_creacion,
          proyecto: t.proyecto || 'Sin proyecto'
        }));

      setTareasRecientes(recientes);

      const tareaIds = tareas.map(t => t.id);
      let totalComentarios = 0;
      let noLeidos = 0;

      if (tareaIds.length > 0) {
        const { data: comentarios } = await supabase
          .from('tarea_comentarios')
          .select('id, leido_por, fecha_creacion')
          .in('tarea_id', tareaIds)
          .eq('eliminado', false);

        if (comentarios) {
          totalComentarios = comentarios.length;
          noLeidos = comentarios.filter(c => {
            const leidoPor = c.leido_por || [];
            return !leidoPor.includes(currentUser);
          }).length;
        }
      }

      setStats({
        totalTareas: total,
        tareasAsignadas: total,
        tareasPendientes: pendientes,
        tareasEnProgreso: 0,
        tareasEnRevision: enRevision,
        tareasCompletadas: completadas,
        tareasCerradas: cerradas,
        totalComentarios,
        comentariosNoLeidos: noLeidos,
        comentariosRecientes: 0,
        archivosSubidos: totalArchivos,
        tareasCreadas: allTareas.filter(t => t.creada_por === currentUser).length,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching editor dashboard data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Cargando datos del dashboard...</div>
      </div>
    );
  }

  const estadoData = [
    { name: 'Pendientes', value: stats.tareasPendientes, color: '#F59E0B' },
    { name: 'En Revisión', value: stats.tareasEnRevision, color: '#3B82F6' },
    { name: 'Resueltas', value: stats.tareasCompletadas, color: '#10B981' },
    { name: 'Con Bugs', value: stats.tareasCerradas, color: '#EF4444' },
  ].filter(item => item.value > 0);

  const actividadData = [
    { name: 'Tareas Asignadas', value: stats.tareasAsignadas },
    { name: 'Tareas Creadas', value: stats.tareasCreadas },
    { name: 'Comentarios', value: stats.totalComentarios },
    { name: 'Archivos', value: stats.archivosSubidos },
  ];

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pendiente: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' },
      'en revisión': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'En Revisión' },
      resuelta: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resuelta' },
      'con bugs': { bg: 'bg-red-100', text: 'text-red-800', label: 'Con Bugs' },
    };
    const badge = badges[estado] || { bg: 'bg-gray-100', text: 'text-gray-800', label: estado };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Panel de Control</h2>
        <p className="text-gray-600">Resumen general</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tareas Asignadas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.tareasAsignadas}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <CheckSquare className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.tareasPendientes}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resueltas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.tareasCompletadas}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Comentarios No Leídos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.comentariosNoLeidos}</p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-full p-2">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">En Revisión</p>
              <p className="text-xl font-bold text-gray-900">{stats.tareasEnRevision}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 rounded-full p-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Con Bugs</p>
              <p className="text-xl font-bold text-gray-900">{stats.tareasCerradas}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="bg-pink-100 rounded-full p-2">
              <MessageSquare className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Comentarios</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalComentarios}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 rounded-full p-2">
              <FileText className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Archivos Subidos</p>
              <p className="text-xl font-bold text-gray-900">{stats.archivosSubidos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Distribución por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={estadoData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {estadoData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Actividad General</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={actividadData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3B82F6" name="Cantidad" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-6 h-6 text-blue-500" />
          <h3 className="text-xl font-bold text-gray-800">Tareas Recientes</h3>
        </div>
        <div className="space-y-3">
          {tareasRecientes.length > 0 ? (
            tareasRecientes.map((tarea) => (
              <div
                key={tarea.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{tarea.nombre_tarea}</p>
                  <p className="text-sm text-gray-600">{tarea.proyecto}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(tarea.fecha_creacion).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>{getEstadoBadge(tarea.estado)}</div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No hay tareas recientes</p>
          )}
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border-l-4 border-blue-500">
        <h3 className="text-lg font-bold text-gray-800 mb-3">Información del Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-600" />
              <p className="text-gray-600">Usuario</p>
            </div>
            <p className="font-semibold text-gray-900">{currentUser}</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <p className="text-gray-600">Última actualización</p>
            </div>
            <p className="font-semibold text-gray-900">{new Date().toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-gray-600" />
              <p className="text-gray-600">Estado del sistema</p>
            </div>
            <p className="font-semibold text-green-600">✓ Operativo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
