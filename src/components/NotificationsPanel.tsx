import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, X, Check, AlertCircle } from 'lucide-react';

interface Notification {
  id: string;
  usuario: string;
  tipo: 'nueva_tarea' | 'nuevo_comentario' | 'tarea_modificada' | 'tarea_eliminada' | 'comentario_eliminado';
  mensaje: string;
  tarea_id: number | null;
  comentario_id: string | null;
  leida: boolean;
  fecha_creacion: string;
  fecha_lectura: string | null;
  tarea?: {
    nombre_tarea: string;
    estado: string;
    uuid_publico: string;
  } | null;
}

interface NotificationsPanelProps {
  currentUser: string;
  onNavigateToTask?: (tareaId: number) => void;
}

export default function NotificationsPanel({ currentUser, onNavigateToTask }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .select(`
          *,
          tareas:tarea_id (
            nombre_tarea,
            estado,
            uuid_publico
          )
        `)
        .eq('usuario', currentUser)
        .eq('leida', false)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((notif: any) => ({
        ...notif,
        tarea: notif.tareas
      }));

      setNotifications(mapped);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('notificaciones')
        .update({
          leida: true,
          fecha_lectura: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;

      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('notificaciones')
        .update({
          leida: true,
          fecha_lectura: new Date().toISOString()
        })
        .eq('usuario', currentUser)
        .eq('leida', false);

      if (error) throw error;

      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    // Solo navegar si la tarea existe y tiene uuid_publico
    if (notification.tarea && notification.tarea_id && onNavigateToTask) {
      onNavigateToTask(notification.tarea_id);
    }
    setShowPanel(false);
  };

  const unreadCount = notifications.length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
        title="Notificaciones"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />

          <div className="absolute right-0 top-12 z-50 w-96 max-h-[600px] bg-white rounded-lg shadow-2xl border-2 border-red-200 overflow-hidden">
            <div className="bg-red-600 text-white px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-semibold">Alertas del Sistema</h3>
                {unreadCount > 0 && (
                  <span className="bg-red-800 text-white text-xs px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="text-white hover:bg-red-700 rounded p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {unreadCount > 0 && (
              <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-sm text-red-700 hover:text-red-900 font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Marcar todas como leídas
                </button>
              </div>
            )}

            <div className="max-h-[500px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No tienes alertas nuevas</p>
                </div>
              ) : (
                <div className="divide-y divide-red-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 hover:bg-red-50 cursor-pointer transition-colors border-l-4 border-red-600"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded">
                          {notification.tipo === 'nueva_tarea' && 'Nueva Tarea'}
                          {notification.tipo === 'nuevo_comentario' && 'Nuevo Comentario'}
                          {notification.tipo === 'tarea_modificada' && 'Tarea Modificada'}
                          {notification.tipo === 'tarea_eliminada' && 'Tarea Eliminada'}
                          {notification.tipo === 'comentario_eliminado' && 'Comentario Eliminado'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="text-gray-400 hover:text-red-600"
                          title="Marcar como leída"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-900 font-medium mb-1">
                        {notification.mensaje}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(notification.fecha_creacion).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {notification.tarea && notification.tarea_id && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          Haz clic para ver la tarea →
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
