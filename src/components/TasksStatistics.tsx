import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertCircle, MessageSquare, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Tarea {
  id: number;
  nombre_tarea: string;
  fecha_creacion: string;
  descripcion_tarea: string;
  estado: 'pendiente' | 'resuelta' | 'con bugs' | 'en revisión';
  fecha_cierre: string | null;
  asignada_a: string[];
  proyecto: 'Copa bplay' | 'La Lupa de Tobi' | 'Bull Power';
  imagen_tarea: string[];
  video_tarea: string[];
}

interface TasksStatisticsProps {
  tareas: Tarea[];
  currentUser?: string;
}

export default function TasksStatistics({ tareas, currentUser }: TasksStatisticsProps) {
  const [comentariosNoLeidos, setComentariosNoLeidos] = useState(0);
  const [comentariosLeidos, setComentariosLeidos] = useState(0);

  useEffect(() => {
    if (!currentUser || tareas.length === 0) return;
    fetchComentariosStats();
  }, [currentUser, tareas]);

  const fetchComentariosStats = async () => {
    if (!currentUser || tareas.length === 0) return;
    const tareaIds = tareas.map(t => t.id);
    const { data } = await supabase
      .from('tarea_comentarios')
      .select('id, leido_por')
      .in('tarea_id', tareaIds)
      .eq('eliminado', false);

    if (data) {
      const noLeidos = data.filter(c => {
        const leidoPor = c.leido_por || [];
        return !leidoPor.includes(currentUser);
      }).length;
      setComentariosNoLeidos(noLeidos);
      setComentariosLeidos(data.length - noLeidos);
    }
  };

  const tareasPendientes = tareas.filter(t => t.estado === 'pendiente').length;
  const tareasResueltas = tareas.filter(t => t.estado === 'resuelta').length;
  const tareasEnRevision = tareas.filter(t => t.estado === 'en revisión').length;
  const tareasConBugs = tareas.filter(t => t.estado === 'con bugs').length;
  const totalTareas = tareas.length;

  const porcentajeResueltas = totalTareas > 0 ? ((tareasResueltas / totalTareas) * 100).toFixed(1) : '0.0';
  const porcentajePendientes = totalTareas > 0 ? (((tareasPendientes + tareasConBugs + tareasEnRevision) / totalTareas) * 100).toFixed(1) : '0.0';
  const totalNoResueltas = tareasPendientes + tareasConBugs + tareasEnRevision;

  const resolvedCircle = totalTareas > 0 ? (tareasResueltas / totalTareas) * 502.4 : 0;
  const pendingCircle = totalTareas > 0 ? (totalNoResueltas / totalTareas) * 502.4 : 0;

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Estadísticas de Tareas</h2>
        {currentUser && (
          <span className="ml-auto text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            Usuario: {currentUser}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-lg shadow-sm border border-yellow-200 flex flex-col items-start gap-2">
          <Clock className="w-6 h-6 text-yellow-600" />
          <p className="text-xs font-medium text-yellow-800">Pendientes</p>
          <p className="text-3xl font-bold text-yellow-900">{tareasPendientes}</p>
          <p className="text-xs text-yellow-700">{totalTareas > 0 ? ((tareasPendientes / totalTareas) * 100).toFixed(1) : '0.0'}% del total</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-lg shadow-sm border border-green-200 flex flex-col items-start gap-2">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <p className="text-xs font-medium text-green-800">Resueltas</p>
          <p className="text-3xl font-bold text-green-900">{tareasResueltas}</p>
          <p className="text-xs text-green-700">{porcentajeResueltas}% del total</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-lg shadow-sm border border-blue-200 flex flex-col items-start gap-2">
          <CheckCircle className="w-6 h-6 text-blue-600" />
          <p className="text-xs font-medium text-blue-800">En Revisión</p>
          <p className="text-3xl font-bold text-blue-900">{tareasEnRevision}</p>
          <p className="text-xs text-blue-700">{totalTareas > 0 ? ((tareasEnRevision / totalTareas) * 100).toFixed(1) : '0.0'}% del total</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-lg shadow-sm border border-red-200 flex flex-col items-start gap-2">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <p className="text-xs font-medium text-red-800">Con Bugs</p>
          <p className="text-3xl font-bold text-red-900">{tareasConBugs}</p>
          <p className="text-xs text-red-700">{totalTareas > 0 ? ((tareasConBugs / totalTareas) * 100).toFixed(1) : '0.0'}% del total</p>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col items-start gap-2">
          <MessageSquare className="w-6 h-6 text-gray-500" />
          <p className="text-xs font-medium text-gray-600">Comentarios Leídos</p>
          <p className="text-3xl font-bold text-gray-900">{comentariosLeidos}</p>
          <p className="text-xs text-gray-500">comentarios</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-lg shadow-sm border border-orange-200 flex flex-col items-start gap-2">
          <MessageSquare className="w-6 h-6 text-orange-600" />
          <p className="text-xs font-medium text-orange-800">Comentarios No Leídos</p>
          <p className="text-3xl font-bold text-orange-900">{comentariosNoLeidos}</p>
          <p className="text-xs text-orange-700">sin leer</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Distribución: Resueltas vs Pendientes
        </h3>
        {totalTareas > 0 ? (
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-52 h-52 flex-shrink-0">
              <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="36" />
                <circle
                  cx="100" cy="100" r="80"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="36"
                  strokeDasharray={`${resolvedCircle} 502.4`}
                  strokeLinecap="round"
                />
                <circle
                  cx="100" cy="100" r="80"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="36"
                  strokeDasharray={`${pendingCircle} 502.4`}
                  strokeDashoffset={`-${resolvedCircle}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{totalTareas}</span>
                <span className="text-xs text-gray-500">total</span>
              </div>
            </div>
            <div className="flex-1 space-y-4 w-full">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-gray-700">Resueltas</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-green-700">{tareasResueltas}</span>
                  <span className="text-sm text-gray-500 ml-2">({porcentajeResueltas}%)</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                  <span className="text-sm font-medium text-gray-700">Pendientes / En curso</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-yellow-700">{totalNoResueltas}</span>
                  <span className="text-sm text-gray-500 ml-2">({porcentajePendientes}%)</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-100">
                  <p className="text-xs text-gray-500">Pendientes</p>
                  <p className="text-lg font-bold text-yellow-700">{tareasPendientes}</p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded border border-blue-100">
                  <p className="text-xs text-gray-500">En Revisión</p>
                  <p className="text-lg font-bold text-blue-700">{tareasEnRevision}</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded border border-red-100">
                  <p className="text-xs text-gray-500">Con Bugs</p>
                  <p className="text-lg font-bold text-red-700">{tareasConBugs}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500">
            No hay tareas para mostrar
          </div>
        )}
      </div>
    </div>
  );
}
