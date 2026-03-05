import React, { useEffect, useState } from 'react';
import { FileText, Calendar, User, MessageCircle, Paperclip, ArrowLeft, AlertTriangle, Minus, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Tarea {
  id: number;
  nombre_tarea: string;
  descripcion_tarea: string;
  proyecto: string;
  asignada_a: string[];
  estado: 'pendiente' | 'en revisión' | 'resuelta' | 'con bugs';
  fecha_creacion: string;
  fecha_cierre: string | null;
  imagen_tarea: string[];
  video_tarea: string[];
  prioridad: 'baja' | 'media' | 'alta';
}

interface Comentario {
  id: number;
  autor: string;
  contenido: string;
  fecha_creacion: string;
  estado: string;
}

interface PublicTaskViewProps {
  uuidPublico: string;
  onBack?: () => void;
}

export const PublicTaskView: React.FC<PublicTaskViewProps> = ({ uuidPublico, onBack }) => {
  const [tarea, setTarea] = useState<Tarea | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTarea();
  }, [uuidPublico]);

  const fetchTarea = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: tareaData, error: tareaError } = await supabase
        .from('tareas')
        .select('*')
        .eq('uuid_publico', uuidPublico)
        .maybeSingle();

      if (tareaError) throw tareaError;
      if (!tareaData) {
        setError('Tarea no encontrada');
        setLoading(false);
        return;
      }

      setTarea(tareaData);

      const { data: comentariosData, error: comentariosError } = await supabase
        .from('tarea_comentarios')
        .select('*')
        .eq('tarea_id', tareaData.id)
        .order('fecha_creacion', { ascending: true });

      if (comentariosError) throw comentariosError;
      setComentarios(comentariosData || []);
    } catch (err: any) {
      console.error('Error fetching tarea:', err);
      setError('Error al cargar la tarea');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'en revisión':
        return 'bg-blue-100 text-blue-800';
      case 'resuelta':
        return 'bg-green-100 text-green-800';
      case 'con bugs':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrioridadConfig = (prioridad: string) => {
    switch (prioridad) {
      case 'alta':
        return {
          badge: 'bg-red-100 text-red-700 ring-2 ring-red-400',
          bar: 'bg-red-500',
          icon: <AlertTriangle className="w-5 h-5" />,
          label: 'Alta',
          description: 'Prioridad alta — atender primero'
        };
      case 'media':
        return {
          badge: 'bg-orange-100 text-orange-600 ring-2 ring-orange-400',
          bar: 'bg-orange-500',
          icon: <Minus className="w-5 h-5" />,
          label: 'Media',
          description: 'Prioridad media'
        };
      default:
        return {
          badge: 'bg-green-100 text-green-700 ring-2 ring-green-400',
          bar: 'bg-green-400',
          icon: <ChevronDown className="w-5 h-5" />,
          label: 'Baja',
          description: 'Prioridad baja'
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tarea...</p>
        </div>
      </div>
    );
  }

  if (error || !tarea) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-xl font-medium text-gray-900">
            {error || 'Tarea no encontrada'}
          </h3>
          <p className="mt-1 text-gray-500">
            El enlace que has seguido no es válido o la tarea no existe.
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </button>
        )}

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-8 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{tarea.nombre_tarea}</h1>
                <p className="text-green-100">{tarea.proyecto}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${getEstadoColor(tarea.estado)}`}>
                  {tarea.estado.charAt(0).toUpperCase() + tarea.estado.slice(1)}
                </span>
                {(() => {
                  const pc = getPrioridadConfig(tarea.prioridad || 'baja');
                  return (
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${pc.badge}`} title={pc.description}>
                      {pc.icon}
                      Prioridad {pc.label}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="flex items-center text-gray-700">
                <User className="w-5 h-5 mr-3 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Asignada a</p>
                  <p className="font-medium">{tarea.asignada_a.join(', ')}</p>
                </div>
              </div>
              <div className="flex items-center text-gray-700">
                <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Fecha de creación</p>
                  <p className="font-medium">{formatDate(tarea.fecha_creacion)}</p>
                </div>
              </div>
              {tarea.fecha_cierre && (
                <div className="flex items-center text-gray-700">
                  <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Fecha de cierre</p>
                    <p className="font-medium">{formatDate(tarea.fecha_cierre)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Descripción</h2>
              <div
                className="text-gray-700 whitespace-pre-wrap rich-content [&_.user-mention]:text-red-600 [&_.user-mention]:font-bold"
                dangerouslySetInnerHTML={{ __html: tarea.descripcion_tarea }}
                onClick={(e) => {
                  const anchor = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null;
                  if (anchor) {
                    e.preventDefault();
                    e.stopPropagation();
                    const rawHref = anchor.getAttribute('href') || '';
                    const url = /^https?:\/\//i.test(rawHref) ? rawHref : `https://${rawHref}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }
                }}
              />
            </div>

            {((tarea.imagen_tarea && tarea.imagen_tarea.length > 0) || (tarea.video_tarea && tarea.video_tarea.length > 0)) && (
              <div className="border-t pt-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Paperclip className="w-5 h-5 mr-2" />
                  Archivos Adjuntos
                </h2>
                <div className="grid grid-cols-1 gap-2">
                  {tarea.imagen_tarea && tarea.imagen_tarea.length > 0 && (
                    <>
                      <h3 className="text-sm font-medium text-gray-700 mt-2 mb-1">
                        Imágenes ({tarea.imagen_tarea.length})
                      </h3>
                      {tarea.imagen_tarea.map((url, index) => (
                        <a
                          key={`img-${index}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-2 text-blue-500" />
                          <span className="text-sm text-gray-700">Imagen {index + 1}</span>
                        </a>
                      ))}
                    </>
                  )}
                  {tarea.video_tarea && tarea.video_tarea.length > 0 && (
                    <>
                      <h3 className="text-sm font-medium text-gray-700 mt-2 mb-1">
                        Videos ({tarea.video_tarea.length})
                      </h3>
                      {tarea.video_tarea.map((url, index) => (
                        <a
                          key={`vid-${index}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-2 text-green-500" />
                          <span className="text-sm text-gray-700">Video {index + 1}</span>
                        </a>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {comentarios.length > 0 && (
              <div className="border-t pt-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Comentarios ({comentarios.length})
                </h2>
                <div className="space-y-4">
                  {comentarios.map((comentario) => (
                    <div key={comentario.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3">
                            {comentario.autor.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{comentario.autor}</p>
                            <p className="text-xs text-gray-500">{formatDate(comentario.fecha_creacion)}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(comentario.estado)}`}>
                          {comentario.estado}
                        </span>
                      </div>
                      <div
                        className="text-gray-700 whitespace-pre-wrap ml-11 rich-content [&_.user-mention]:text-red-600 [&_.user-mention]:font-bold"
                        dangerouslySetInnerHTML={{ __html: comentario.contenido }}
                        onClick={(e) => {
                          const anchor = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null;
                          if (anchor) {
                            e.preventDefault();
                            e.stopPropagation();
                            const rawHref = anchor.getAttribute('href') || '';
                            const url = /^https?:\/\//i.test(rawHref) ? rawHref : `https://${rawHref}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Esta es una vista de solo lectura. Para editar esta tarea, contacta al administrador.</p>
        </div>
      </div>
    </div>
  );
};
