import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, RefreshCw, Mail, Edit, Trash2, MessageCircle, CheckCircle, AlertCircle, X } from 'lucide-react';

interface IconConfig {
  id: string;
  tipo_notificacion: string;
  icono_url: string;
  icono_nombre: string;
}

interface IconOption {
  url: string;
  nombre: string;
  categoria: string;
}

const ICONOS_DISPONIBLES: IconOption[] = [
  // Tareas - Azul
  { url: 'https://img.icons8.com/fluency/96/task.png', nombre: 'Task (Azul)', categoria: 'Tareas' },
  { url: 'https://img.icons8.com/fluency/96/todo-list.png', nombre: 'Todo List (Azul)', categoria: 'Tareas' },
  { url: 'https://img.icons8.com/fluency/96/list.png', nombre: 'List (Azul)', categoria: 'Tareas' },
  { url: 'https://img.icons8.com/fluency/96/checklist.png', nombre: 'Checklist (Azul)', categoria: 'Tareas' },
  { url: 'https://img.icons8.com/fluency/96/checkmark.png', nombre: 'Checkmark (Verde)', categoria: 'Tareas' },

  // Tareas - Verde
  { url: 'https://img.icons8.com/color/96/task-completed.png', nombre: 'Task Completed (Verde)', categoria: 'Tareas' },
  { url: 'https://img.icons8.com/color/96/todo-list.png', nombre: 'Todo List (Multicolor)', categoria: 'Tareas' },
  { url: 'https://img.icons8.com/color/96/checked--v1.png', nombre: 'Checked (Verde)', categoria: 'Tareas' },

  // Edición - Amarillo/Naranja
  { url: 'https://img.icons8.com/fluency/96/edit.png', nombre: 'Edit (Amarillo)', categoria: 'Edición' },
  { url: 'https://img.icons8.com/fluency/96/pencil.png', nombre: 'Pencil (Amarillo)', categoria: 'Edición' },
  { url: 'https://img.icons8.com/fluency/96/edit-property.png', nombre: 'Edit Property (Amarillo)', categoria: 'Edición' },
  { url: 'https://img.icons8.com/fluency/96/edit-file.png', nombre: 'Edit File (Amarillo)', categoria: 'Edición' },
  { url: 'https://img.icons8.com/fluency/96/create.png', nombre: 'Create (Amarillo)', categoria: 'Edición' },

  // Edición - Azul
  { url: 'https://img.icons8.com/color/96/edit--v1.png', nombre: 'Edit (Azul)', categoria: 'Edición' },
  { url: 'https://img.icons8.com/color/96/pencil--v1.png', nombre: 'Pencil (Azul)', categoria: 'Edición' },

  // Eliminación - Rojo
  { url: 'https://img.icons8.com/fluency/96/delete-sign.png', nombre: 'Delete Sign (Rojo)', categoria: 'Eliminación' },
  { url: 'https://img.icons8.com/fluency/96/trash.png', nombre: 'Trash (Rojo)', categoria: 'Eliminación' },
  { url: 'https://img.icons8.com/fluency/96/delete-forever.png', nombre: 'Delete Forever (Rojo)', categoria: 'Eliminación' },
  { url: 'https://img.icons8.com/fluency/96/delete.png', nombre: 'Delete (Rojo)', categoria: 'Eliminación' },
  { url: 'https://img.icons8.com/color/96/delete-sign--v1.png', nombre: 'Delete Sign Alt (Rojo)', categoria: 'Eliminación' },
  { url: 'https://img.icons8.com/color/96/trash--v1.png', nombre: 'Trash Alt (Rojo)', categoria: 'Eliminación' },

  // Comentarios - Verde/Azul
  { url: 'https://img.icons8.com/fluency/96/chat.png', nombre: 'Chat (Verde)', categoria: 'Comentarios' },
  { url: 'https://img.icons8.com/fluency/96/speech-bubble.png', nombre: 'Speech Bubble (Azul)', categoria: 'Comentarios' },
  { url: 'https://img.icons8.com/fluency/96/comment.png', nombre: 'Comment (Azul)', categoria: 'Comentarios' },
  { url: 'https://img.icons8.com/fluency/96/comments.png', nombre: 'Comments (Verde)', categoria: 'Comentarios' },
  { url: 'https://img.icons8.com/fluency/96/chat-message.png', nombre: 'Chat Message (Verde)', categoria: 'Comentarios' },
  { url: 'https://img.icons8.com/color/96/speech-bubble--v1.png', nombre: 'Speech Bubble Alt (Azul)', categoria: 'Comentarios' },
  { url: 'https://img.icons8.com/color/96/chat--v1.png', nombre: 'Chat Alt (Verde)', categoria: 'Comentarios' },

  // Comentarios - Edición
  { url: 'https://img.icons8.com/fluency/96/edit-message.png', nombre: 'Edit Message (Amarillo)', categoria: 'Comentarios' },
  { url: 'https://img.icons8.com/color/96/edit-message.png', nombre: 'Edit Message Alt (Amarillo)', categoria: 'Comentarios' },

  // Comentarios - Eliminación
  { url: 'https://img.icons8.com/fluency/96/delete-message.png', nombre: 'Delete Message (Rojo)', categoria: 'Comentarios' },
  { url: 'https://img.icons8.com/color/96/delete-message.png', nombre: 'Delete Message Alt (Rojo)', categoria: 'Comentarios' },

  // Notificaciones - Campanas
  { url: 'https://img.icons8.com/fluency/96/bell.png', nombre: 'Bell (Amarillo)', categoria: 'Notificaciones' },
  { url: 'https://img.icons8.com/fluency/96/appointment-reminders.png', nombre: 'Reminder (Azul)', categoria: 'Notificaciones' },
  { url: 'https://img.icons8.com/color/96/bell--v1.png', nombre: 'Bell Alt (Amarillo)', categoria: 'Notificaciones' },

  // Éxito - Verde
  { url: 'https://img.icons8.com/fluency/96/ok.png', nombre: 'OK (Verde)', categoria: 'Estado' },
  { url: 'https://img.icons8.com/fluency/96/checkmark--v1.png', nombre: 'Checkmark Alt (Verde)', categoria: 'Estado' },
  { url: 'https://img.icons8.com/fluency/96/checked-checkbox.png', nombre: 'Checked (Verde)', categoria: 'Estado' },

  // Alerta - Amarillo/Naranja
  { url: 'https://img.icons8.com/fluency/96/high-priority.png', nombre: 'High Priority (Naranja)', categoria: 'Estado' },
  { url: 'https://img.icons8.com/fluency/96/error.png', nombre: 'Error (Rojo)', categoria: 'Estado' },
  { url: 'https://img.icons8.com/fluency/96/warning-shield.png', nombre: 'Warning (Amarillo)', categoria: 'Estado' },

  // Email - Específicos
  { url: 'https://img.icons8.com/fluency/96/email.png', nombre: 'Email (Azul)', categoria: 'Email' },
  { url: 'https://img.icons8.com/fluency/96/email-open.png', nombre: 'Email Open (Azul)', categoria: 'Email' },
  { url: 'https://img.icons8.com/fluency/96/new-post.png', nombre: 'New Post (Azul)', categoria: 'Email' },
  { url: 'https://img.icons8.com/color/96/email--v1.png', nombre: 'Email Alt (Azul)', categoria: 'Email' },

  // Usuarios - Personas
  { url: 'https://img.icons8.com/fluency/96/user.png', nombre: 'User (Azul)', categoria: 'Usuarios' },
  { url: 'https://img.icons8.com/fluency/96/user-male-circle.png', nombre: 'User Circle (Azul)', categoria: 'Usuarios' },
  { url: 'https://img.icons8.com/fluency/96/conference-call.png', nombre: 'Team (Multicolor)', categoria: 'Usuarios' },

  // Documentos
  { url: 'https://img.icons8.com/fluency/96/document.png', nombre: 'Document (Azul)', categoria: 'Documentos' },
  { url: 'https://img.icons8.com/fluency/96/file.png', nombre: 'File (Azul)', categoria: 'Documentos' },
  { url: 'https://img.icons8.com/fluency/96/note.png', nombre: 'Note (Amarillo)', categoria: 'Documentos' },

  // Fecha/Tiempo
  { url: 'https://img.icons8.com/fluency/96/clock.png', nombre: 'Clock (Azul)', categoria: 'Tiempo' },
  { url: 'https://img.icons8.com/fluency/96/calendar.png', nombre: 'Calendar (Azul)', categoria: 'Tiempo' },
  { url: 'https://img.icons8.com/fluency/96/time.png', nombre: 'Time (Azul)', categoria: 'Tiempo' },

  // Otros
  { url: 'https://img.icons8.com/fluency/96/star.png', nombre: 'Star (Amarillo)', categoria: 'Otros' },
  { url: 'https://img.icons8.com/fluency/96/lightning-bolt.png', nombre: 'Lightning (Amarillo)', categoria: 'Otros' },
  { url: 'https://img.icons8.com/fluency/96/info.png', nombre: 'Info (Azul)', categoria: 'Otros' },
];

const TIPOS_NOTIFICACION = [
  { key: 'nueva_tarea', label: 'Nueva Tarea', icon: CheckCircle, color: 'text-blue-600' },
  { key: 'tarea_modificada', label: 'Tarea Modificada', icon: Edit, color: 'text-yellow-600' },
  { key: 'tarea_eliminada', label: 'Tarea Eliminada', icon: Trash2, color: 'text-red-600' },
  { key: 'nuevo_comentario', label: 'Nuevo Comentario', icon: MessageCircle, color: 'text-green-600' },
  { key: 'comentario_modificado', label: 'Comentario Modificado', icon: Edit, color: 'text-yellow-600' },
  { key: 'comentario_eliminado', label: 'Comentario Eliminado', icon: Trash2, color: 'text-red-600' },
];

export default function EmailIconsManagement() {
  const [configs, setConfigs] = useState<IconConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [filterCategoria, setFilterCategoria] = useState<string>('Todas');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_icons_config')
        .select('*')
        .order('tipo_notificacion', { ascending: true });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Error fetching configs:', error);
      setNotification({ type: 'error', message: 'Error al cargar configuración' });
    } finally {
      setLoading(false);
    }
  };

  const updateIcon = async (tipoNotificacion: string, iconoUrl: string, iconoNombre: string) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('email_icons_config')
        .update({
          icono_url: iconoUrl,
          icono_nombre: iconoNombre,
          updated_at: new Date().toISOString()
        })
        .eq('tipo_notificacion', tipoNotificacion);

      if (error) throw error;

      await fetchConfigs();
      setSelectedTipo(null);
      setNotification({ type: 'success', message: 'Icono actualizado correctamente' });
    } catch (error) {
      console.error('Error updating icon:', error);
      setNotification({ type: 'error', message: 'Error al actualizar icono' });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('¿Estás seguro de que quieres restaurar todos los iconos a los valores por defecto?')) {
      return;
    }

    try {
      setSaving(true);

      const defaults = [
        { tipo: 'nueva_tarea', url: 'https://img.icons8.com/fluency/96/task.png', nombre: 'Task Icon' },
        { tipo: 'tarea_modificada', url: 'https://img.icons8.com/fluency/96/edit.png', nombre: 'Edit Icon' },
        { tipo: 'tarea_eliminada', url: 'https://img.icons8.com/fluency/96/delete-sign.png', nombre: 'Delete Icon' },
        { tipo: 'nuevo_comentario', url: 'https://img.icons8.com/fluency/96/chat.png', nombre: 'Chat Icon' },
        { tipo: 'comentario_modificado', url: 'https://img.icons8.com/fluency/96/edit-message.png', nombre: 'Edit Message Icon' },
        { tipo: 'comentario_eliminado', url: 'https://img.icons8.com/fluency/96/delete-message.png', nombre: 'Delete Message Icon' },
      ];

      for (const def of defaults) {
        await supabase
          .from('email_icons_config')
          .update({
            icono_url: def.url,
            icono_nombre: def.nombre,
            updated_at: new Date().toISOString()
          })
          .eq('tipo_notificacion', def.tipo);
      }

      await fetchConfigs();
      setNotification({ type: 'success', message: 'Iconos restaurados a valores por defecto' });
    } catch (error) {
      console.error('Error resetting icons:', error);
      setNotification({ type: 'error', message: 'Error al restaurar iconos' });
    } finally {
      setSaving(false);
    }
  };

  const getConfigForTipo = (tipo: string) => {
    return configs.find(c => c.tipo_notificacion === tipo);
  };

  const categorias = ['Todas', ...Array.from(new Set(ICONOS_DISPONIBLES.map(i => i.categoria)))];

  const iconosFiltrados = filterCategoria === 'Todas'
    ? ICONOS_DISPONIBLES
    : ICONOS_DISPONIBLES.filter(i => i.categoria === filterCategoria);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-8 h-8 text-blue-600" />
            Gestión de Iconos de Email
          </h2>
          <p className="text-gray-600 mt-1">
            Configura los iconos que aparecen en los emails de notificación
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${saving ? 'animate-spin' : ''}`} />
          Restaurar por Defecto
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg ${notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Current Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Configuración Actual</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIPOS_NOTIFICACION.map((tipo) => {
            const config = getConfigForTipo(tipo.key);
            const Icon = tipo.icon;

            return (
              <div
                key={tipo.key}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedTipo(tipo.key)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Icon className={`w-5 h-5 ${tipo.color}`} />
                  <h4 className="font-semibold text-gray-900">{tipo.label}</h4>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded">
                  {config?.icono_url && (
                    <img
                      src={config.icono_url}
                      alt={config.icono_nombre}
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://img.icons8.com/fluency/96/error.png';
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 truncate">{config?.icono_nombre}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTipo(tipo.key);
                  }}
                  className="mt-3 w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Cambiar Icono
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Icon Selection Modal */}
      {selectedTipo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  Seleccionar Icono para: {TIPOS_NOTIFICACION.find(t => t.key === selectedTipo)?.label}
                </h3>
                <button
                  onClick={() => setSelectedTipo(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Category Filter */}
              <div className="mt-4 flex flex-wrap gap-2">
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategoria(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterCategoria === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Icons Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {iconosFiltrados.map((icono, index) => (
                  <button
                    key={index}
                    onClick={() => updateIcon(selectedTipo, icono.url, icono.nombre)}
                    disabled={saving}
                    className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
                  >
                    <img
                      src={icono.url}
                      alt={icono.nombre}
                      className="w-16 h-16 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://img.icons8.com/fluency/96/error.png';
                      }}
                    />
                    <span className="text-xs text-center text-gray-600">{icono.nombre}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{iconosFiltrados.length} iconos disponibles</span>
                <button
                  onClick={() => setSelectedTipo(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
