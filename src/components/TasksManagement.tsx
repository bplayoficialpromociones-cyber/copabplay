import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Pencil as Edit2, Trash2, X, Upload, FileText, Video, CheckCircle, AlertCircle, Download, Eye, MessageCircle, Share2, DownloadCloud } from 'lucide-react';
import TaskComments from './TaskComments';
import TasksStatistics from './TasksStatistics';
import LinkifiedText from './LinkifiedText';
import RichTextEditor from './RichTextEditor';
import jsPDF from 'jspdf';

const decodeHtmlEntities = (html: string): string => {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
};

const stripHtmlToText = (html: string): string => {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  } catch {
    return html.replace(/<[^>]*>/g, '');
  }
};

// Función para truncar texto a un máximo de caracteres
const truncateText = (text: string, maxLength: number = 30): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Función para normalizar capitalización: Primera letra mayúscula después de punto o salto de línea
const normalizeCapitalization = (text: string): string => {
  if (!text) return '';

  const anchorPlaceholders: string[] = [];
  let processed = text.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (match) => {
    const idx = anchorPlaceholders.length;
    anchorPlaceholders.push(match);
    return `__ANCHOR_PLACEHOLDER_${idx}__`;
  });

  const trimmed = processed.trim();
  if (!trimmed || trimmed.startsWith('__ANCHOR_PLACEHOLDER_')) {
    return processed.replace(/__ANCHOR_PLACEHOLDER_(\d+)__/g, (_m, idx) => anchorPlaceholders[Number(idx)]);
  }

  let normalized = processed.toLowerCase();
  normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  normalized = normalized.replace(/\.\s+(.)/g, (_m, char) => '. ' + char.toUpperCase());
  normalized = normalized.replace(/\n(.)/g, (_m, char) => '\n' + char.toUpperCase());

  normalized = normalized.replace(/__anchor_placeholder_(\d+)__/gi, (_m, idx) => anchorPlaceholders[Number(idx)]);

  return normalized;
};

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
  uuid_publico: string;
  leida_por?: string[];
  creada_por: string;
  prioridad: 'baja' | 'media' | 'alta';
}

interface Filters {
  id: string;
  nombre_tarea: string;
  asignada_a: string;
  estado: string;
  proyecto: string;
  fecha_creacion: string;
  fecha_cierre: string;
  descripcion_tarea: string;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const ITEMS_PER_PAGE = 5;
const ESTADOS = ['con bugs', 'en revisión', 'pendiente', 'resuelta'];
const PROYECTOS = ['La Lupa de Tobi', 'Copa bplay', 'Bull Power'];
const PRIORIDADES = ['baja', 'media', 'alta'] as const;

interface TasksManagementProps {
  openTareaId?: number;
  currentUser?: string;
  onCloseTask?: () => void;
}

export default function TasksManagement({ openTareaId, currentUser = 'Max', onCloseTask }: TasksManagementProps = {}) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [filteredTareas, setFilteredTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTarea, setEditingTarea] = useState<Tarea | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Tarea | null>(null);
  const [blockDeleteUnread, setBlockDeleteUnread] = useState<{ tarea: Tarea; usersWithUnread: string[] } | null>(null);
  const [viewingDescription, setViewingDescription] = useState<Tarea | null>(null);
  const [pendingCommentsCount, setPendingCommentsCount] = useState<Record<number, number>>({});
  const [showUnreadWarning, setShowUnreadWarning] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [usuarios, setUsuarios] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [filters, setFilters] = useState<Filters>({
    id: '',
    nombre_tarea: '',
    asignada_a: '',
    estado: 'pendiente',
    proyecto: '',
    fecha_creacion: '',
    fecha_cierre: '',
    descripcion_tarea: ''
  });

  const [formData, setFormData] = useState({
    nombre_tarea: '',
    descripcion_tarea: '',
    estado: '' as '' | 'pendiente' | 'resuelta' | 'con bugs' | 'en revisión',
    asignada_a: [] as string[],
    proyecto: '' as '' | 'Copa bplay' | 'La Lupa de Tobi' | 'Bull Power',
    imagenes_tarea: [] as File[],
    videos_tarea: [] as File[],
    prioridad: '' as '' | 'baja' | 'media' | 'alta'
  });

  useEffect(() => {
    fetchTareas();
    fetchPendingCommentsCount();
    fetchUsuarios();

    const channelId = `tareas-realtime-${currentUser}-${Date.now()}`;
    const tareasChannel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tareas'
        },
        async (payload) => {
          console.log(`[${currentUser}] ⚡ Cambio detectado en tareas (TasksManagement):`, payload.eventType);

          if (payload.eventType === 'INSERT' && payload.new) {
            const newTarea = payload.new as Tarea;
            console.log(`[${currentUser}] ✅ INSERT - Nueva tarea ID: ${newTarea.id} "${newTarea.nombre_tarea}"`);
            console.log(`[${currentUser}] ✅ INSERT - Asignada a:`, newTarea.asignada_a);
            console.log(`[${currentUser}] ✅ INSERT - Creada por:`, newTarea.creada_por);

            const isRelevant =
              (newTarea.asignada_a && newTarea.asignada_a.includes(currentUser)) ||
              newTarea.creada_por === currentUser;

            if (isRelevant) {
              console.log(`[${currentUser}] 🎯 TAREA RELEVANTE - Agregando a grilla en tiempo real`);

              setTareas(prevTareas => {
                const exists = prevTareas.some(t => t.id === newTarea.id);
                if (exists) {
                  console.log(`[${currentUser}] ⚠️ Tarea ${newTarea.id} ya existe, no agregando duplicado`);
                  return prevTareas;
                }
                console.log(`[${currentUser}] ➕ Agregando tarea ${newTarea.id} a la grilla`);
                return [newTarea, ...prevTareas];
              });
            } else {
              console.log(`[${currentUser}] ⛔ Tarea NO relevante para este usuario, ignorando`);
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedTarea = payload.new as Tarea;
            console.log(`[${currentUser}] 📝 UPDATE - Tarea ID: ${updatedTarea.id}`);
            console.log(`[${currentUser}] 📝 UPDATE - Asignada a:`, updatedTarea.asignada_a);
            console.log(`[${currentUser}] 📝 UPDATE - Creada por:`, updatedTarea.creada_por);

            const isRelevant =
              (updatedTarea.asignada_a && updatedTarea.asignada_a.includes(currentUser)) ||
              updatedTarea.creada_por === currentUser;

            setTareas(prevTareas => {
              const exists = prevTareas.some(t => t.id === updatedTarea.id);

              if (isRelevant) {
                if (exists) {
                  console.log(`[${currentUser}] ♻️ Actualizando tarea ${updatedTarea.id} en grilla`);
                  return prevTareas.map(t => t.id === updatedTarea.id ? updatedTarea : t);
                } else {
                  console.log(`[${currentUser}] ➕ Tarea ${updatedTarea.id} ahora es relevante, agregando`);
                  return [updatedTarea, ...prevTareas];
                }
              } else {
                if (exists) {
                  console.log(`[${currentUser}] ➖ Tarea ${updatedTarea.id} ya no es relevante, removiendo`);
                  return prevTareas.filter(t => t.id !== updatedTarea.id);
                }
                console.log(`[${currentUser}] ⛔ Tarea ${updatedTarea.id} no es relevante, ignorando`);
                return prevTareas;
              }
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedId = (payload.old as any).id;
            console.log(`[${currentUser}] 🗑️ DELETE - Tarea ID: ${deletedId}`);

            setTareas(prevTareas => {
              const exists = prevTareas.some(t => t.id === deletedId);
              if (exists) {
                console.log(`[${currentUser}] ➖ Removiendo tarea ${deletedId} de grilla`);
                return prevTareas.filter(t => t.id !== deletedId);
              }
              console.log(`[${currentUser}] ⚠️ Tarea ${deletedId} no estaba en grilla`);
              return prevTareas;
            });
          }

          await fetchPendingCommentsCount();
        }
      )
      .subscribe((status) => {
        console.log(`[${currentUser}] 🔌 Estado de suscripción a tareas (TasksManagement):`, status);
      });

    const comentariosChannelId = `comentarios-realtime-${currentUser}-${Date.now()}`;
    const comentariosChannel = supabase
      .channel(comentariosChannelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tarea_comentarios'
        },
        (payload) => {
          console.log(`[${currentUser}] 💬 Cambio detectado en comentarios (TasksManagement):`, payload.eventType);
          fetchPendingCommentsCount();
        }
      )
      .subscribe((status) => {
        console.log(`[${currentUser}] 🔌 Estado de suscripción a comentarios (TasksManagement):`, status);
      });

    return () => {
      console.log(`[${currentUser}] 🔌 Desconectando canales de Realtime`);
      supabase.removeChannel(tareasChannel);
      supabase.removeChannel(comentariosChannel);
    };
  }, [currentUser]);

  const fetchUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_credentials')
        .select('username')
        .eq('activo', true)
        .order('username', { ascending: true });

      if (error) throw error;
      setUsuarios((data || []).map(u => u.username));
    } catch (error) {
      console.error('Error fetching usuarios:', error);
    }
  };

  useEffect(() => {
    if (openTareaId && tareas.length > 0) {
      const tarea = tareas.find(t => t.id === openTareaId);
      if (tarea) {
        openModal(tarea);
      }
    }
  }, [openTareaId, tareas]);

  useEffect(() => {
    applyFilters();
  }, [tareas, filters]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const fetchPendingCommentsCount = async () => {
    try {
      const { data, error } = await supabase
        .from('tarea_comentarios')
        .select('tarea_id, estado, eliminado')
        .eq('estado', 'pendiente')
        .eq('eliminado', false);

      if (error) throw error;

      const counts: Record<number, number> = {};
      data?.forEach((comment: any) => {
        counts[comment.tarea_id] = (counts[comment.tarea_id] || 0) + 1;
      });

      setPendingCommentsCount(counts);
    } catch (error) {
      console.error('Error fetching pending comments count:', error);
    }
  };

  const fetchTareas = async () => {
    try {
      console.log(`[${currentUser}] fetchTareas - Iniciando carga...`);

      const { data, error } = await supabase
        .from('tareas')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;

      console.log(`[${currentUser}] fetchTareas - Total tareas en BD:`, data?.length || 0);
      console.log(`[${currentUser}] fetchTareas - Todas las tareas:`, data?.map(t => ({ id: t.id, nombre: t.nombre_tarea, asignada_a: t.asignada_a, creada_por: t.creada_por })));

      const filteredData = (data || []).filter((tarea: Tarea) => {
        const isAssignedTo = tarea.asignada_a && tarea.asignada_a.includes(currentUser);
        const isCreatedBy = tarea.creada_por === currentUser;
        const shouldInclude = isAssignedTo || isCreatedBy;

        if (!shouldInclude) {
          console.log(`[${currentUser}] fetchTareas - EXCLUIDA tarea ${tarea.id} "${tarea.nombre_tarea}" - asignada_a:`, tarea.asignada_a, 'creada_por:', tarea.creada_por);
        }

        return shouldInclude;
      });

      console.log(`[${currentUser}] fetchTareas - Tareas filtradas para usuario:`, filteredData.length);
      console.log(`[${currentUser}] fetchTareas - Tareas del usuario:`, filteredData.map(t => ({ id: t.id, nombre: t.nombre_tarea })));

      setTareas(filteredData);
    } catch (error) {
      console.error('Error fetching tareas:', error);
      showNotification('error', 'Error al cargar las tareas');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    // tareas ya viene filtrado por usuario desde fetchTareas(), solo aplicar filtros adicionales
    let filtered = [...tareas];

    console.log(`[${currentUser}] applyFilters - Total tareas del usuario:`, tareas.length);
    console.log(`[${currentUser}] applyFilters - Tareas:`, tareas.map(t => ({ id: t.id, nombre: t.nombre_tarea, asignada_a: t.asignada_a })));

    if (filters.id) {
      filtered = filtered.filter(t => t.id.toString().includes(filters.id));
    }
    if (filters.nombre_tarea) {
      filtered = filtered.filter(t =>
        t.nombre_tarea.toLowerCase().includes(filters.nombre_tarea.toLowerCase())
      );
    }
    if (filters.asignada_a) {
      // Corregido: verificar si el array incluye al usuario seleccionado
      filtered = filtered.filter(t =>
        Array.isArray(t.asignada_a) && t.asignada_a.includes(filters.asignada_a)
      );
    }
    if (filters.estado) {
      filtered = filtered.filter(t => t.estado === filters.estado);
    }
    if (filters.proyecto) {
      filtered = filtered.filter(t => t.proyecto === filters.proyecto);
    }
    if (filters.fecha_creacion) {
      filtered = filtered.filter(t =>
        t.fecha_creacion.includes(filters.fecha_creacion)
      );
    }
    if (filters.fecha_cierre) {
      filtered = filtered.filter(t =>
        t.fecha_cierre?.includes(filters.fecha_cierre)
      );
    }
    if (filters.descripcion_tarea) {
      filtered = filtered.filter(t =>
        t.descripcion_tarea.toLowerCase().includes(filters.descripcion_tarea.toLowerCase())
      );
    }

    console.log(`[${currentUser}] applyFilters - Tareas después de filtros:`, filtered.length);
    setFilteredTareas(filtered);
    setCurrentPage(1);
  };

  const uploadFile = async (file: File, type: 'imagen' | 'video') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${type}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('tareas-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('tareas-files')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const uploadMultipleFiles = async (files: File[], type: 'imagen' | 'video') => {
    const uploadPromises = files.map(file => uploadFile(file, type));
    return await Promise.all(uploadPromises);
  };

  const createNotifications = async (
    usuarios: string[],
    tipo: 'nueva_tarea' | 'nuevo_comentario' | 'tarea_modificada' | 'tarea_eliminada',
    mensaje: string | ((usuario: string) => string),
    tareaId: number,
    comentarioId?: string,
    tareaNombre?: string,
    proyecto?: string,
    excludeCurrentUser: boolean = false
  ) => {
    const logId = Math.random().toString(36).substring(7);
    console.log(`[${currentUser}][${logId}] 🔔 Iniciando createNotifications:`, {
      usuarios,
      tipo,
      tareaId,
      tareaNombre,
      excludeCurrentUser
    });

    let success = false;
    let errorMessage = null;
    let notificationsCreated = 0;

    try {
      let targetUsuarios = usuarios;

      if (excludeCurrentUser) {
        targetUsuarios = usuarios.filter(usuario => usuario !== currentUser);
        console.log(`[${currentUser}][${logId}] Usuarios después de excluir actual:`, targetUsuarios);
      }

      if (targetUsuarios.length === 0) {
        console.log(`[${currentUser}][${logId}] ⚠️ No hay usuarios para notificar (todos excluidos)`);
        errorMessage = 'No hay usuarios para notificar';
        return;
      }

      const notifications = targetUsuarios.map(usuario => ({
        usuario,
        tipo,
        mensaje: typeof mensaje === 'function' ? mensaje(usuario) : mensaje,
        tarea_id: tareaId,
        comentario_id: comentarioId || null,
        leida: false
      }));

      console.log(`[${currentUser}][${logId}] 📝 Insertando ${notifications.length} notificaciones:`, notifications);

      const { data: insertedNotifications, error: notifError } = await supabase
        .from('notificaciones')
        .insert(notifications)
        .select();

      if (notifError) {
        console.error(`[${currentUser}][${logId}] ❌ Error al insertar notificaciones:`, notifError);
        throw notifError;
      }

      notificationsCreated = insertedNotifications?.length || 0;
      success = true;
      console.log(`[${currentUser}][${logId}] ✅ ${notificationsCreated} notificaciones creadas exitosamente`);
    } catch (error: any) {
      console.error(`[${currentUser}][${logId}] ❌ Error creating notifications:`, error);
      errorMessage = error?.message || String(error);
    } finally {
      // Registrar en la tabla de auditoría
      try {
        await supabase.from('notification_logs').insert({
          tipo,
          usuarios_objetivo: usuarios,
          mensaje: typeof mensaje === 'function' ? mensaje(usuarios[0] || 'usuario') : mensaje,
          tarea_id: tareaId,
          tarea_nombre: tareaNombre,
          proyecto: proyecto,
          exclude_current_user: excludeCurrentUser,
          requesting_user: currentUser,
          success,
          error_message: errorMessage,
          notifications_created: notificationsCreated
        });
        console.log(`[${currentUser}][${logId}] 📊 Log de auditoría creado`);
      } catch (logError) {
        console.error(`[${currentUser}][${logId}] ⚠️ Error al crear log de auditoría:`, logError);
      }
    }
  };

  const sendEmailNotifications = async (
    usuarios: string[],
    tipo: 'nueva_tarea' | 'nuevo_comentario' | 'tarea_modificada' | 'tarea_eliminada',
    mensaje: string | ((usuario: string) => string),
    tareaId: number,
    tareaNombre?: string,
    proyecto?: string
  ) => {
    try {
      for (const usuario of usuarios) {
        try {
          const emailPayload = {
            usuario: usuario,
            tipo: tipo,
            mensaje: typeof mensaje === 'function' ? mensaje(usuario) : mensaje,
            tarea_id: tareaId,
            tarea_nombre: tareaNombre,
            proyecto: proyecto,
            url_tarea: `https://copabplay.com.ar/admin/tareas?tarea_id=${tareaId}`
          };

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-task-notification-email`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify(emailPayload)
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            console.error(`Error sending email to ${usuario}:`, errorData);
          } else {
            console.log(`Email sent successfully to ${usuario}`);
          }
        } catch (emailError) {
          console.error(`Failed to send email to ${usuario}:`, emailError);
        }
      }
    } catch (error) {
      console.error('Error sending email notifications:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.asignada_a.length === 0) {
      showNotification('error', 'Debes seleccionar al menos un usuario');
      return;
    }

    if (!formData.proyecto) {
      showNotification('error', 'Debes seleccionar un proyecto');
      return;
    }

    if (!formData.estado) {
      showNotification('error', 'Debes seleccionar un estado');
      return;
    }

    if (!formData.prioridad) {
      showNotification('error', 'Debes seleccionar una prioridad');
      return;
    }

    if (editingTarea && formData.estado === 'resuelta' && editingTarea.estado !== 'resuelta') {
      const { data: commentsData } = await supabase
        .from('tarea_comentarios')
        .select('id, autor, leido_por')
        .eq('tarea_id', editingTarea.id)
        .eq('eliminado', false);

      const unreadByOthers = (commentsData || []).filter(
        (c: any) => c.autor !== currentUser && !(c.leido_por || []).includes(currentUser)
      );

      if (unreadByOthers.length > 0) {
        setShowUnreadWarning(true);
        return;
      }
    }

    setLoading(true);
    setIsProcessing(true);
    setUploadProgress(0);

    try {
      setProcessingMessage('Preparando archivos...');
      setUploadProgress(10);

      let imagenesUrls = editingTarea?.imagen_tarea || [];
      let videosUrls = editingTarea?.video_tarea || [];

      if (formData.imagenes_tarea.length > 0) {
        setProcessingMessage(`Subiendo imágenes (${formData.imagenes_tarea.length})...`);
        setUploadProgress(20);
        const newImageUrls = await uploadMultipleFiles(formData.imagenes_tarea, 'imagen');
        imagenesUrls = [...imagenesUrls, ...newImageUrls];
        setUploadProgress(40);
      }

      if (formData.videos_tarea.length > 0) {
        setProcessingMessage(`Subiendo videos (${formData.videos_tarea.length})...`);
        setUploadProgress(50);
        const newVideoUrls = await uploadMultipleFiles(formData.videos_tarea, 'video');
        videosUrls = [...videosUrls, ...newVideoUrls];
        setUploadProgress(60);
      }

      const tareaData = {
        nombre_tarea: normalizeCapitalization(formData.nombre_tarea),
        descripcion_tarea: normalizeCapitalization(formData.descripcion_tarea),
        estado: formData.estado,
        asignada_a: formData.asignada_a,
        proyecto: formData.proyecto,
        imagen_tarea: imagenesUrls,
        video_tarea: videosUrls,
        prioridad: formData.prioridad
      };

      let tareaId: number;

      if (editingTarea) {
        setProcessingMessage('Actualizando tarea...');
        setUploadProgress(70);

        const { error } = await supabase
          .from('tareas')
          .update(tareaData)
          .eq('id', editingTarea.id);

        if (error) throw error;
        tareaId = editingTarea.id;

        setUploadProgress(75);
        setProcessingMessage('Sincronizando grillas...');

        await new Promise(resolve => setTimeout(resolve, 3500));

        setUploadProgress(85);

        const oldAsignados = editingTarea.asignada_a;
        const newAsignados = formData.asignada_a;

        // Usuarios que fueron desasignados (están en old pero no en new)
        const usuariosDesasignados = oldAsignados.filter(u => !newAsignados.includes(u));

        // Usuarios que siguen asignados o fueron agregados (solo los que están en new)
        const usuariosActivos = newAsignados;

        if (editingTarea.estado !== 'resuelta' && formData.estado !== 'resuelta') {
          setProcessingMessage('Enviando alertas...');
          setUploadProgress(90);

          // Notificar a usuarios activos sobre la modificación
          if (usuariosActivos.length > 0) {
            await createNotifications(
              usuariosActivos,
              'tarea_modificada',
              `La tarea "${formData.nombre_tarea}" ha sido modificada`,
              tareaId,
              undefined,
              formData.nombre_tarea,
              formData.proyecto,
              true
            );
          }

          // Notificar a usuarios desasignados que la tarea fue eliminada de su lista
          if (usuariosDesasignados.length > 0) {
            console.log(`[${currentUser}] Notificando desasignación a:`, usuariosDesasignados);
            await createNotifications(
              usuariosDesasignados,
              'tarea_eliminada',
              `${currentUser} te desasignó de la tarea "${formData.nombre_tarea}"`,
              tareaId,
              undefined,
              formData.nombre_tarea,
              formData.proyecto,
              true
            );
          }

          setUploadProgress(95);
          setProcessingMessage('Enviando emails...');

          // Enviar emails a usuarios activos
          if (usuariosActivos.length > 0) {
            await sendEmailNotifications(
              usuariosActivos,
              'tarea_modificada',
              `La tarea "${formData.nombre_tarea}" ha sido modificada`,
              tareaId,
              formData.nombre_tarea,
              formData.proyecto
            );
          }

          // Enviar emails a usuarios desasignados
          if (usuariosDesasignados.length > 0) {
            await sendEmailNotifications(
              usuariosDesasignados,
              'tarea_eliminada',
              `${currentUser} te desasignó de la tarea "${formData.nombre_tarea}"`,
              tareaId,
              formData.nombre_tarea,
              formData.proyecto
            );
          }
        }
      } else {
        setProcessingMessage('Creando tarea...');
        setUploadProgress(70);

        const { data: newTarea, error } = await supabase
          .from('tareas')
          .insert([{ ...tareaData, creada_por: currentUser }])
          .select()
          .single();

        if (error) throw error;
        tareaId = newTarea.id;

        setUploadProgress(75);
        setProcessingMessage('Sincronizando grillas...');

        await new Promise(resolve => setTimeout(resolve, 3500));

        setUploadProgress(90);
        setProcessingMessage('Enviando alertas...');

        const allRecipients = [...new Set([...formData.asignada_a, currentUser])];

        await createNotifications(
          allRecipients,
          'nueva_tarea',
          (usuario) =>
            usuario === currentUser
              ? `Has creado la tarea "${formData.nombre_tarea}"`
              : `Se te ha asignado la tarea "${formData.nombre_tarea}"`,
          tareaId,
          undefined,
          formData.nombre_tarea,
          formData.proyecto,
          true
        );

        setUploadProgress(95);
        setProcessingMessage('Enviando emails...');

        await sendEmailNotifications(
          allRecipients,
          'nueva_tarea',
          (usuario) =>
            usuario === currentUser
              ? `Has creado la tarea "${formData.nombre_tarea}"`
              : `Se te ha asignado la tarea "${formData.nombre_tarea}"`,
          tareaId,
          formData.nombre_tarea,
          formData.proyecto
        );
      }

      setProcessingMessage('Finalizando...');
      setUploadProgress(90);

      await fetchTareas();
      await fetchPendingCommentsCount();

      setUploadProgress(100);
      closeModal();
      showNotification('success', editingTarea ? 'Tarea actualizada correctamente' : 'Tarea creada correctamente');
    } catch (error) {
      console.error('Error saving tarea:', error);
      showNotification('error', 'Error al guardar la tarea');
    } finally {
      setLoading(false);
      setIsProcessing(false);
      setUploadProgress(0);
      setProcessingMessage('');
    }
  };

  const handleDeleteClick = async (tarea: Tarea) => {
    try {
      const { data: comments, error } = await supabase
        .from('tarea_comentarios')
        .select('autor, leido_por')
        .eq('tarea_id', tarea.id)
        .eq('eliminado', false);

      if (error) throw error;

      if (!comments || comments.length === 0) {
        setConfirmDelete(tarea);
        return;
      }

      const allUsers = Array.from(new Set([
        ...(tarea.asignada_a || []),
        tarea.creada_por
      ])).filter(Boolean);

      const usersWithUnread = allUsers.filter(user => {
        return comments.some(comment => {
          if (comment.autor === user) return false;
          return !(comment.leido_por || []).includes(user);
        });
      });

      if (usersWithUnread.length > 0) {
        setBlockDeleteUnread({ tarea, usersWithUnread });
      } else {
        setConfirmDelete(tarea);
      }
    } catch {
      setConfirmDelete(tarea);
    }
  };

  const handleDelete = async (tarea: Tarea) => {
    setIsProcessing(true);
    setUploadProgress(0);

    try {
      console.log(`[${currentUser}] Iniciando eliminación de tarea:`, tarea.nombre_tarea);
      console.log(`[${currentUser}] Usuarios asignados:`, tarea.asignada_a);

      // Guardar info de la tarea antes de eliminar
      const tareaInfo = {
        id: tarea.id,
        nombre: tarea.nombre_tarea,
        proyecto: tarea.proyecto,
        asignados: tarea.asignada_a,
        imagenes: tarea.imagen_tarea,
        videos: tarea.video_tarea
      };

      // PASO 1: Crear notificaciones ANTES de eliminar (porque necesitamos la FK válida)
      setProcessingMessage('Creando notificaciones...');
      setUploadProgress(15);

      console.log(`[${currentUser}] Creando notificaciones para:`, tareaInfo.asignados);
      await createNotifications(
        tareaInfo.asignados,
        'tarea_eliminada',
        `${currentUser} eliminó la tarea "${tareaInfo.nombre}"`,
        tareaInfo.id,
        undefined,
        tareaInfo.nombre,
        tareaInfo.proyecto,
        true
      );

      // PASO 2: Enviar emails
      setUploadProgress(30);
      setProcessingMessage('Enviando emails...');

      console.log(`[${currentUser}] Enviando emails a:`, tareaInfo.asignados);
      await sendEmailNotifications(
        tareaInfo.asignados,
        'tarea_eliminada',
        `${currentUser} eliminó la tarea "${tareaInfo.nombre}"`,
        tareaInfo.id,
        tareaInfo.nombre,
        tareaInfo.proyecto
      );

      // PASO 3: ELIMINAR la tarea de la base de datos
      setProcessingMessage('Eliminando tarea...');
      setUploadProgress(50);

      console.log(`[${currentUser}] Eliminando tarea de la base de datos...`);
      const { error } = await supabase
        .from('tareas')
        .delete()
        .eq('id', tarea.id);

      if (error) throw error;

      // PASO 4: Esperar que Realtime sincronice todas las grillas
      setUploadProgress(70);
      setProcessingMessage('Sincronizando grillas...');
      console.log(`[${currentUser}] Esperando sincronización Realtime en todas las grillas...`);
      await new Promise(resolve => setTimeout(resolve, 3500));

      // PASO 5: Eliminar archivos del storage
      setProcessingMessage('Eliminando archivos...');
      setUploadProgress(85);

      if (tareaInfo.imagenes && tareaInfo.imagenes.length > 0) {
        const imagePaths = tareaInfo.imagenes
          .map(url => url.split('/tareas-files/')[1])
          .filter(path => path);
        if (imagePaths.length > 0) {
          await supabase.storage.from('tareas-files').remove(imagePaths);
        }
      }

      if (tareaInfo.videos && tareaInfo.videos.length > 0) {
        const videoPaths = tareaInfo.videos
          .map(url => url.split('/tareas-files/')[1])
          .filter(path => path);
        if (videoPaths.length > 0) {
          await supabase.storage.from('tareas-files').remove(videoPaths);
        }
      }

      setProcessingMessage('Finalizando...');
      setUploadProgress(90);

      await fetchTareas();
      await fetchPendingCommentsCount();

      setUploadProgress(100);
      setConfirmDelete(null);
      showNotification('success', 'Tarea eliminada correctamente');
    } catch (error) {
      console.error('Error deleting tarea:', error);
      showNotification('error', 'Error al eliminar la tarea');
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
      setProcessingMessage('');
    }
  };


  const openModal = (tarea?: Tarea) => {
    if (tarea) {
      setEditingTarea(tarea);
      setFormData({
        nombre_tarea: tarea.nombre_tarea,
        descripcion_tarea: tarea.descripcion_tarea,
        estado: tarea.estado,
        asignada_a: tarea.asignada_a,
        proyecto: tarea.proyecto,
        imagenes_tarea: [],
        videos_tarea: [],
        prioridad: tarea.prioridad || 'baja'
      });
    } else {
      setEditingTarea(null);
      setFormData({
        nombre_tarea: '',
        descripcion_tarea: '',
        estado: '',
        asignada_a: [],
        proyecto: '',
        imagenes_tarea: [],
        videos_tarea: [],
        prioridad: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTarea(null);
    if (onCloseTask) {
      onCloseTask();
    }
    setFormData({
      nombre_tarea: '',
      descripcion_tarea: '',
      estado: '',
      asignada_a: [],
      proyecto: '',
      imagenes_tarea: [],
      videos_tarea: [],
      prioridad: ''
    });
    fetchPendingCommentsCount();
  };

  const stripHtml = (html: string): string => {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  };

  const downloadTaskPDF = async (tarea: Tarea) => {
    // Fetch comments FIRST before any PDF work
    const { data: comentariosData, error: comentariosError } = await supabase
      .from('tarea_comentarios')
      .select('id, contenido, autor, estado, created_at')
      .eq('tarea_id', tarea.id)
      .eq('eliminado', false)
      .order('created_at', { ascending: true });

    if (comentariosError) {
      console.error('Error fetching comentarios for PDF:', comentariosError);
    }
    const comentarios = comentariosData || [];

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = pageWidth - 2 * margin;
    const footerH = 12;
    const usableH = pageHeight - footerH - margin;

    // --- Color palette ---
    const GREEN        = [22, 163, 74]   as [number,number,number];
    const GREEN_DARK   = [15, 118, 53]   as [number,number,number];
    const WHITE        = [255, 255, 255] as [number,number,number];
    const GRAY_BG      = [248, 250, 252] as [number,number,number];
    const GRAY_BORDER  = [226, 232, 240] as [number,number,number];
    const GRAY_TEXT    = [71, 85, 105]   as [number,number,number];
    const DARK_TEXT    = [15, 23, 42]    as [number,number,number];
    const RED          = [220, 38, 38]   as [number,number,number];
    const AMBER        = [217, 119, 6]   as [number,number,number];
    const BLUE         = [37, 99, 235]   as [number,number,number];
    const BLUE_LIGHT   = [239, 246, 255] as [number,number,number];
    const BLUE_BORDER  = [191, 219, 254] as [number,number,number];

    // --- Current Y cursor ---
    let y = margin;

    const newPage = () => {
      doc.addPage();
      y = margin;
    };

    const ensureSpace = (needed: number) => {
      if (y + needed > usableH) newPage();
    };

    const formatDateEs = (dateStr: string) =>
      new Date(dateStr).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

    const getEstadoColors = (estado: string) => {
      switch (estado) {
        case 'pendiente':   return { bg: [254,243,199] as [number,number,number], text: [146,64,14]  as [number,number,number] };
        case 'en revisión': return { bg: [219,234,254] as [number,number,number], text: [30,64,175]  as [number,number,number] };
        case 'resuelta':    return { bg: [220,252,231] as [number,number,number], text: [20,83,45]   as [number,number,number] };
        case 'con bugs':    return { bg: [254,226,226] as [number,number,number], text: [153,27,27]  as [number,number,number] };
        default:            return { bg: [243,244,246] as [number,number,number], text: [55,65,81]   as [number,number,number] };
      }
    };

    // Parse HTML into flat word tokens with styling
    type Token = { text: string; color?: [number,number,number]; bold?: boolean };

    const htmlToTokens = (html: string): Token[] => {
      if (!html) return [];
      const div = document.createElement('div');
      div.innerHTML = html;
      const tokens: Token[] = [];

      const walk = (node: Node, bold = false, color?: [number,number,number]) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const t = node.textContent || '';
          if (t) tokens.push({ text: t, bold, color });
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const isBold = bold || ['b','strong'].includes(tag) || el.style.fontWeight === 'bold' || el.style.fontWeight === '700';
        let elColor = color;
        const cs = el.style.color;
        if (cs) {
          const m = cs.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/) || cs.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
          if (m) elColor = m[0].startsWith('#') ? [parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)] : [parseInt(m[1]),parseInt(m[2]),parseInt(m[3])];
        }
        if (tag === 'a') { tokens.push({ text: el.textContent || el.getAttribute('href') || '', bold: isBold, color: RED }); return; }
        if (el.getAttribute('data-mention') === 'true' || el.classList.contains('user-mention')) { tokens.push({ text: el.textContent || '', bold: true, color: AMBER }); return; }
        if (tag === 'br') { tokens.push({ text: '\n' }); return; }
        if (tag === 'p' || tag === 'div') {
          if (tokens.length && tokens[tokens.length-1].text !== '\n') tokens.push({ text: '\n' });
          Array.from(el.childNodes).forEach(c => walk(c, isBold, elColor));
          tokens.push({ text: '\n' });
          return;
        }
        if (tag === 'li') {
          tokens.push({ text: '• ', bold: isBold, color: elColor });
          Array.from(el.childNodes).forEach(c => walk(c, isBold, elColor));
          tokens.push({ text: '\n' });
          return;
        }
        Array.from(el.childNodes).forEach(c => walk(c, isBold, elColor));
      };

      Array.from(div.childNodes).forEach(c => walk(c));
      return tokens;
    };

    // Measure how many lines a rich-text block will take
    const measureRichTextLines = (html: string, textW: number): number => {
      doc.setFontSize(9);
      const tokens = htmlToTokens(html);
      let lines = 1;
      let lineW = 0;
      for (const tok of tokens) {
        if (tok.text === '\n') { lines++; lineW = 0; continue; }
        const words = tok.text.split(/(\s+)/);
        for (const w of words) {
          if (!w) continue;
          doc.setFont('helvetica', tok.bold ? 'bold' : 'normal');
          const ww = doc.getTextWidth(w);
          if (lineW + ww > textW && lineW > 0) { lines++; lineW = 0; }
          lineW += ww;
        }
      }
      return lines;
    };

    // Render rich text — NO page break logic inside, caller must ensure space
    const renderRichText = (html: string, startX: number, startY: number, textW: number): number => {
      const LH = 5.5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const tokens = htmlToTokens(html);

      let cx = startX;
      let cy = startY;
      let lineW = 0;
      let lineTokens: Token[] = [];

      const flushLine = () => {
        if (!lineTokens.length) return;
        let px = startX;
        for (const t of lineTokens) {
          doc.setFont('helvetica', t.bold ? 'bold' : 'normal');
          doc.setTextColor(...(t.color || DARK_TEXT));
          doc.text(t.text, px, cy);
          px += doc.getTextWidth(t.text);
        }
        cy += LH;
        lineTokens = [];
        lineW = 0;
        cx = startX;
      };

      for (const tok of tokens) {
        if (tok.text === '\n') { flushLine(); continue; }
        const words = tok.text.split(/(\s+)/);
        for (const w of words) {
          if (!w) continue;
          doc.setFont('helvetica', tok.bold ? 'bold' : 'normal');
          const ww = doc.getTextWidth(w);
          if (lineW + ww > textW && lineTokens.length > 0) flushLine();
          lineTokens.push({ text: w, bold: tok.bold, color: tok.color });
          lineW += ww;
          cx += ww;
        }
      }
      flushLine();
      doc.setTextColor(...DARK_TEXT);
      doc.setFont('helvetica', 'normal');
      return cy;
    };

    // Render rich text with automatic page breaks (used for long content)
    const renderRichTextPaged = (html: string, startX: number, textW: number): void => {
      const LH = 5.5;
      doc.setFontSize(9);
      const tokens = htmlToTokens(html);
      let lineTokens: Token[] = [];
      let lineW = 0;

      const flushLine = () => {
        if (!lineTokens.length) return;
        ensureSpace(LH + 2);
        let px = startX;
        for (const t of lineTokens) {
          doc.setFont('helvetica', t.bold ? 'bold' : 'normal');
          doc.setTextColor(...(t.color || DARK_TEXT));
          doc.text(t.text, px, y);
          px += doc.getTextWidth(t.text);
        }
        y += LH;
        lineTokens = [];
        lineW = 0;
      };

      for (const tok of tokens) {
        if (tok.text === '\n') { flushLine(); continue; }
        const words = tok.text.split(/(\s+)/);
        for (const w of words) {
          if (!w) continue;
          doc.setFont('helvetica', tok.bold ? 'bold' : 'normal');
          const ww = doc.getTextWidth(w);
          if (lineW + ww > textW && lineTokens.length > 0) flushLine();
          lineTokens.push({ text: w, bold: tok.bold, color: tok.color });
          lineW += ww;
        }
      }
      flushLine();
      doc.setTextColor(...DARK_TEXT);
      doc.setFont('helvetica', 'normal');
    };

    const drawSectionHeader = (label: string, color: [number,number,number]) => {
      ensureSpace(14);
      doc.setFillColor(...color);
      doc.rect(margin, y, 3, 8, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK_TEXT);
      doc.text(label, margin + 7, y + 6);
      y += 13;
    };

    // ============================================================
    // PAGE 1 HEADER BANNER
    // ============================================================
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const titleMaxW = contentW - 30;
    const titleLines = doc.splitTextToSize(tarea.nombre_tarea, titleMaxW);
    const titleLH = 6.5;
    const bannerH = 14 + titleLines.length * titleLH + 8;

    doc.setFillColor(...GREEN);
    doc.rect(0, 0, pageWidth, bannerH, 'F');
    doc.setFillColor(...GREEN_DARK);
    doc.rect(0, bannerH - 3, pageWidth, 3, 'F');

    // Brand label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text('HAGAN JUEGO', margin, 9);

    // Estado badge top-right
    const estadoColors = getEstadoColors(tarea.estado);
    const estadoLabel = tarea.estado.charAt(0).toUpperCase() + tarea.estado.slice(1);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const badgeW = doc.getTextWidth(estadoLabel) + 8;
    const badgeX = pageWidth - margin - badgeW;
    doc.setFillColor(...estadoColors.bg);
    doc.roundedRect(badgeX, 4, badgeW, 7, 2, 2, 'F');
    doc.setTextColor(...estadoColors.text);
    doc.text(estadoLabel, badgeX + 4, 9.5);

    // Title (wrapped)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(titleLines, margin, 18);

    // Subtitle
    const subtitleY = 18 + titleLines.length * titleLH;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...WHITE);
    doc.text(`#${tarea.id} · ${tarea.proyecto}`, margin, subtitleY);

    y = bannerH + 8;

    // ============================================================
    // INFO GRID
    // ============================================================
    ensureSpace(32);
    const infoH = tarea.fecha_cierre ? 30 : 22;
    doc.setFillColor(...GRAY_BG);
    doc.roundedRect(margin, y, contentW, infoH, 3, 3, 'F');
    doc.setDrawColor(...GRAY_BORDER);
    doc.roundedRect(margin, y, contentW, infoH, 3, 3, 'S');

    const c1x = margin + 5;
    const c2x = margin + contentW / 2 + 5;
    const halfW = contentW / 2 - 10;

    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY_TEXT);
    doc.text('ASIGNADA A', c1x, y + 7);
    doc.text('PROYECTO', c2x, y + 7);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK_TEXT);
    doc.text(doc.splitTextToSize(tarea.asignada_a.join(', '), halfW), c1x, y + 13);
    doc.text(doc.splitTextToSize(tarea.proyecto, halfW), c2x, y + 13);
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY_TEXT);
    doc.text('FECHA CREACION', c1x, y + 20);
    if (tarea.fecha_cierre) doc.text('FECHA CIERRE', c2x, y + 20);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK_TEXT);
    doc.text(formatDateEs(tarea.fecha_creacion), c1x, y + 26);
    if (tarea.fecha_cierre) doc.text(formatDateEs(tarea.fecha_cierre), c2x, y + 26);

    y += infoH + 10;

    // ============================================================
    // PRIORIDAD BANNER
    // ============================================================
    const prioridadVal = tarea.prioridad || 'baja';
    const prioridadColors: Record<string, { bg: [number,number,number]; text: [number,number,number]; border: [number,number,number]; icon: string }> = {
      alta:  { bg: [254,226,226] as [number,number,number], text: [153,27,27]  as [number,number,number], border: [248,113,113] as [number,number,number], icon: '[!!!] ALTA' },
      media: { bg: [255,237,213] as [number,number,number], text: [154,52,18]  as [number,number,number], border: [251,146,60]  as [number,number,number], icon: '[~] MEDIA' },
      baja:  { bg: [220,252,231] as [number,number,number], text: [20,83,45]   as [number,number,number], border: [74,222,128]  as [number,number,number], icon: '[v] BAJA' }
    };
    const pc = prioridadColors[prioridadVal] || prioridadColors.baja;

    ensureSpace(14);
    doc.setFillColor(...pc.bg);
    doc.setDrawColor(...pc.border);
    doc.roundedRect(margin, y, contentW, 11, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...pc.text);
    doc.text(`PRIORIDAD  ${pc.icon}`, margin + 5, y + 7.5);
    y += 15;

    // ============================================================
    // DESCRIPCION — render with page breaks
    // ============================================================
    drawSectionHeader('Descripcion', GREEN);
    renderRichTextPaged(tarea.descripcion_tarea, margin + 5, contentW - 10);
    y += 8;

    // ============================================================
    // ARCHIVOS ADJUNTOS
    // ============================================================
    const hasImages = tarea.imagen_tarea && tarea.imagen_tarea.length > 0;
    const hasVideos = tarea.video_tarea && tarea.video_tarea.length > 0;

    if (hasImages || hasVideos) {
      drawSectionHeader('Archivos Adjuntos', BLUE);

      if (hasImages) {
        ensureSpace(10);
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY_TEXT);
        doc.text(`Imagenes (${tarea.imagen_tarea.length})`, margin, y);
        y += 6;
        tarea.imagen_tarea.forEach((url, i) => {
          doc.setFontSize(8); doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(`${i + 1}. ${url}`, contentW - 8);
          ensureSpace(lines.length * 5 + 2);
          doc.setTextColor(...BLUE);
          doc.text(lines, margin + 4, y);
          y += lines.length * 5 + 2;
        });
        y += 3;
      }

      if (hasVideos) {
        ensureSpace(10);
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY_TEXT);
        doc.text(`Videos (${tarea.video_tarea.length})`, margin, y);
        y += 6;
        tarea.video_tarea.forEach((url, i) => {
          doc.setFontSize(8); doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(`${i + 1}. ${url}`, contentW - 8);
          ensureSpace(lines.length * 5 + 2);
          doc.setTextColor(...GREEN);
          doc.text(lines, margin + 4, y);
          y += lines.length * 5 + 2;
        });
        y += 3;
      }
    }

    // ============================================================
    // COMENTARIOS
    // ============================================================
    if (comentarios.length > 0) {
      y += 4;
      drawSectionHeader(`Comentarios (${comentarios.length})`, BLUE);

      for (let idx = 0; idx < comentarios.length; idx++) {
        const c = comentarios[idx];
        const textInCard = contentW - 14;
        const lineCount = measureRichTextLines(c.contenido, textInCard);
        const bodyH = Math.max(lineCount * 5.5 + 4, 10);
        const headerH = 11;
        const cardH = headerH + bodyH + 6;

        // If card fits on current page, draw it; otherwise new page
        ensureSpace(cardH + 4);

        const cardX = margin;
        const cardY = y;

        // Card background
        doc.setFillColor(249, 250, 251);
        doc.setDrawColor(...GRAY_BORDER);
        doc.roundedRect(cardX, cardY, contentW, cardH, 2, 2, 'FD');

        // Left accent bar color by estado
        const cc = getEstadoColors(c.estado || 'pendiente');
        doc.setFillColor(...cc.text);
        doc.rect(cardX, cardY, 3, cardH, 'F');

        // Header strip
        doc.setFillColor(...BLUE_LIGHT);
        doc.setDrawColor(...BLUE_BORDER);
        doc.rect(cardX + 3, cardY, contentW - 3, headerH, 'F');
        doc.line(cardX + 3, cardY + headerH, cardX + contentW, cardY + headerH);

        // Index
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLUE);
        doc.text(`#${idx + 1}`, cardX + 6, cardY + 7.5);

        // Author
        doc.setTextColor(...DARK_TEXT);
        doc.text(c.autor || '', cardX + 16, cardY + 7.5);

        // Date right
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY_TEXT);
        const ds = formatDateEs(c.created_at);
        doc.text(ds, cardX + contentW - 3, cardY + 7.5, { align: 'right' });

        // Estado badge in header
        if (c.estado) {
          const el2 = c.estado.charAt(0).toUpperCase() + c.estado.slice(1);
          doc.setFontSize(7); doc.setFont('helvetica', 'bold');
          const bw = doc.getTextWidth(el2) + 6;
          const dw = doc.getTextWidth(ds);
          const bx = cardX + contentW - 3 - dw - bw - 5;
          doc.setFillColor(...cc.bg);
          doc.roundedRect(bx, cardY + 3, bw, 6, 1, 1, 'F');
          doc.setTextColor(...cc.text);
          doc.text(el2, bx + 3, cardY + 7.5);
        }

        // Body text — render inline (space already ensured)
        const bodyStartY = cardY + headerH + 5;
        renderRichText(c.contenido, cardX + 7, bodyStartY, textInCard);

        y = cardY + cardH + 4;
      }
    }

    // ============================================================
    // FOOTER on every page
    // ============================================================
    const totalPages = (doc as any).internal.getNumberOfPages();
    const shortTitle = doc.splitTextToSize(`Tarea #${tarea.id} · ${tarea.nombre_tarea}`, pageWidth - 2 * margin - 25)[0];
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFillColor(...GRAY_BG);
      doc.rect(0, pageHeight - footerH, pageWidth, footerH, 'F');
      doc.setDrawColor(...GRAY_BORDER);
      doc.line(0, pageHeight - footerH, pageWidth, pageHeight - footerH);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY_TEXT);
      doc.text(shortTitle, margin, pageHeight - 4);
      doc.text(`Pagina ${p} / ${totalPages}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
    }

    const fileName = `Tarea_${tarea.id}_${tarea.nombre_tarea.replace(/[^a-z0-9]/gi, '_')}.pdf`;
    doc.save(fileName);
    showNotification('success', 'PDF descargado correctamente');
  };

  const copyPublicLink = async (tarea: Tarea) => {
    try {
      const publicUrl = `${window.location.origin}/tarea/${tarea.uuid_publico}`;
      await navigator.clipboard.writeText(publicUrl);
      window.open(publicUrl, '_blank');
      showNotification('success', 'Link copiado al portapapeles');
    } catch (error) {
      console.error('Error copying link:', error);
      showNotification('error', 'Error al copiar el link');
    }
  };

  const downloadAllFiles = async (tarea: Tarea) => {
    const allFiles = [
      ...(tarea.imagen_tarea || []),
      ...(tarea.video_tarea || [])
    ];

    if (allFiles.length === 0) {
      showNotification('error', 'No hay archivos para descargar');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadMessage(`Preparando descarga de ${allFiles.length} archivo(s)...`);

    try {
      const totalFiles = allFiles.length;
      let downloadedFiles = 0;

      for (const fileUrl of allFiles) {
        try {
          const fileName = fileUrl.split('/').pop() || 'archivo';
          setDownloadMessage(`Descargando ${fileName} (${downloadedFiles + 1}/${totalFiles})...`);

          const response = await fetch(fileUrl);
          if (!response.ok) throw new Error(`Error al descargar ${fileName}`);

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          downloadedFiles++;
          setDownloadProgress((downloadedFiles / totalFiles) * 100);

          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error descargando archivo ${fileUrl}:`, error);
        }
      }

      setDownloadMessage(`Descarga completada: ${downloadedFiles} de ${totalFiles} archivo(s)`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      showNotification('success', `Se descargaron ${downloadedFiles} de ${totalFiles} archivo(s)`);
    } catch (error) {
      console.error('Error descargando archivos:', error);
      showNotification('error', 'Error al descargar los archivos');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
      setDownloadMessage('');
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-50';
      case 'en revisión':
        return 'bg-blue-50';
      case 'resuelta':
        return 'bg-green-50';
      case 'con bugs':
        return 'bg-red-50';
      default:
        return 'bg-white';
    }
  };

  const isReadOnly = (tarea: Tarea) => tarea.estado === 'resuelta';

  const totalPages = Math.ceil(filteredTareas.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTareas = filteredTareas.slice(startIndex, endIndex);

  if (loading && tareas.length === 0) {
    return <div className="flex justify-center items-center h-64">Cargando tareas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Tareas</h2>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Tarea
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Filtros de Búsqueda</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="ID"
            value={filters.id}
            onChange={(e) => setFilters({ ...filters, id: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Nombre de tarea"
            value={filters.nombre_tarea}
            onChange={(e) => setFilters({ ...filters, nombre_tarea: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={filters.asignada_a}
            onChange={(e) => setFilters({ ...filters, asignada_a: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los asignados</option>
            {usuarios.map(asignado => (
              <option key={asignado} value={asignado}>{asignado}</option>
            ))}
          </select>
          <select
            value={filters.estado}
            onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map(estado => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>
          <select
            value={filters.proyecto}
            onChange={(e) => setFilters({ ...filters, proyecto: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los proyectos</option>
            {PROYECTOS.map(proyecto => (
              <option key={proyecto} value={proyecto}>{proyecto}</option>
            ))}
          </select>
          <input
            type="date"
            placeholder="Fecha de creación"
            value={filters.fecha_creacion}
            onChange={(e) => setFilters({ ...filters, fecha_creacion: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="date"
            placeholder="Fecha de cierre"
            value={filters.fecha_cierre}
            onChange={(e) => setFilters({ ...filters, fecha_cierre: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Descripción"
            value={filters.descripcion_tarea}
            onChange={(e) => setFilters({ ...filters, descripcion_tarea: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ID</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Proyecto</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Creada por</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Asignada a</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Fecha Creación</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Estado</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Prioridad</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nombre</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Fecha Cierre</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Archivos</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentTareas.map((tarea) => (
                <tr key={tarea.id} className={getEstadoColor(tarea.estado)}>
                  <td className="px-2 py-3 text-sm text-gray-900">{tarea.id}</td>
                  <td className="px-2 py-3 text-sm text-gray-900 font-medium">{tarea.proyecto}</td>
                  <td className="px-2 py-3 text-sm text-gray-900">{tarea.creada_por}</td>
                  <td className="px-2 py-3 text-sm text-gray-900">
                    {tarea.asignada_a.join(', ')}
                  </td>
                  <td className="px-2 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {new Date(tarea.fecha_creacion).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-2 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        tarea.estado === 'pendiente' ? 'bg-yellow-200 text-yellow-800' :
                        tarea.estado === 'en revisión' ? 'bg-blue-200 text-blue-800' :
                        tarea.estado === 'resuelta' ? 'bg-green-200 text-green-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {tarea.estado}
                      </span>
                      {pendingCommentsCount[tarea.id] > 0 && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold animate-pulse border-2 border-orange-300"
                          title={`${pendingCommentsCount[tarea.id]} comentario${pendingCommentsCount[tarea.id] > 1 ? 's' : ''} pendiente${pendingCommentsCount[tarea.id] > 1 ? 's' : ''}`}
                        >
                          <MessageCircle className="w-3 h-3" />
                          {pendingCommentsCount[tarea.id]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-sm">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full ${
                      tarea.prioridad === 'alta' ? 'bg-red-100 text-red-700 ring-1 ring-red-300' :
                      tarea.prioridad === 'media' ? 'bg-orange-100 text-orange-600 ring-1 ring-orange-300' :
                      'bg-green-100 text-green-700 ring-1 ring-green-300'
                    }`}>
                      {tarea.prioridad === 'alta' ? '▲' : tarea.prioridad === 'media' ? '●' : '▼'}
                      {tarea.prioridad}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-sm text-gray-900 font-medium" title={tarea.nombre_tarea}>
                    {truncateText(tarea.nombre_tarea, 28)}
                  </td>
                  <td className="px-2 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {tarea.fecha_cierre ? new Date(tarea.fecha_cierre).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '-'}
                  </td>
                  <td className="px-2 py-3 text-sm">
                    <div className="flex gap-1 items-center">
                      {tarea.imagen_tarea && tarea.imagen_tarea.length > 0 && (
                        <span className="flex items-center gap-1 text-blue-600" title={`${tarea.imagen_tarea.length} imagen(es)`}>
                          <FileText className="w-4 h-4" />
                          <span className="text-xs font-semibold">{tarea.imagen_tarea.length}</span>
                        </span>
                      )}
                      {tarea.video_tarea && tarea.video_tarea.length > 0 && (
                        <span className="flex items-center gap-1 text-green-600" title={`${tarea.video_tarea.length} video(s)`}>
                          <Video className="w-4 h-4" />
                          <span className="text-xs font-semibold">{tarea.video_tarea.length}</span>
                        </span>
                      )}
                      {((tarea.imagen_tarea && tarea.imagen_tarea.length > 0) || (tarea.video_tarea && tarea.video_tarea.length > 0)) && (
                        <button
                          onClick={() => downloadAllFiles(tarea)}
                          className="text-cyan-600 hover:text-cyan-800 transition-colors"
                          title="Descargar todos los archivos"
                        >
                          <DownloadCloud className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyPublicLink(tarea)}
                        className="text-indigo-600 hover:text-indigo-800"
                        title="Copiar link público"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewingDescription(tarea)}
                        className="text-purple-600 hover:text-purple-800"
                        title="Ver Descripción"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => downloadTaskPDF(tarea)}
                        className="text-green-600 hover:text-green-800"
                        title="Descargar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {isReadOnly(tarea) ? (
                        <button
                          onClick={() => openModal(tarea)}
                          className="text-gray-600 hover:text-gray-800"
                          title="Ver (solo lectura)"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => openModal(tarea)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(tarea)}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTareas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron tareas
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="text-gray-700">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      )}

      <TasksStatistics tareas={tareas} currentUser={currentUser} />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editingTarea ? (isReadOnly(editingTarea) ? 'Ver Tarea (Solo Lectura)' : 'Editar Tarea') : 'Nueva Tarea'}
                </h3>
                {editingTarea && isReadOnly(editingTarea) && (
                  <p className="text-sm text-gray-600 mt-1">
                    Esta tarea está {editingTarea.estado} y no puede ser modificada
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {editingTarea && editingTarea.uuid_publico && (
                  <button
                    type="button"
                    onClick={() => copyPublicLink(editingTarea)}
                    title="Copiar link de vista pública"
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all duration-150"
                  >
                    <Share2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Compartir</span>
                  </button>
                )}
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {editingTarea && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Creada por
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingTarea.creada_por}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la tarea *
                </label>
                <input
                  type="text"
                  required
                  disabled={editingTarea ? isReadOnly(editingTarea) : false}
                  value={formData.nombre_tarea}
                  onChange={(e) => setFormData({ ...formData, nombre_tarea: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción *
                </label>
                <RichTextEditor
                  value={formData.descripcion_tarea}
                  onChange={(html) => setFormData({ ...formData, descripcion_tarea: html })}
                  placeholder="Escribe la descripción de la tarea..."
                  minHeight={140}
                  disabled={editingTarea ? isReadOnly(editingTarea) : false}
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proyecto *
                  </label>
                  <div className={`p-3 border border-gray-300 rounded-lg ${editingTarea && isReadOnly(editingTarea) ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    {PROYECTOS.map(proyecto => (
                      <label key={proyecto} className={`flex items-center space-x-2 py-1 ${editingTarea && isReadOnly(editingTarea) ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name="proyecto"
                          disabled={editingTarea ? isReadOnly(editingTarea) : false}
                          checked={formData.proyecto === proyecto}
                          onChange={() => setFormData({ ...formData, proyecto: proyecto as any })}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm text-gray-700">{proyecto}</span>
                      </label>
                    ))}
                  </div>
                  {!formData.proyecto && !(editingTarea && isReadOnly(editingTarea)) && (
                    <p className="mt-1 text-sm text-red-600">Debes seleccionar un proyecto</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asignada a * (selecciona uno o más)
                  </label>
                  <div className={`p-3 border border-gray-300 rounded-lg ${editingTarea && isReadOnly(editingTarea) ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    {usuarios.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Cargando usuarios...</p>
                    ) : (
                      usuarios.map(asignado => (
                        <label key={asignado} className={`flex items-center space-x-2 py-1 ${editingTarea && isReadOnly(editingTarea) ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            disabled={editingTarea ? isReadOnly(editingTarea) : false}
                            checked={formData.asignada_a.includes(asignado)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, asignada_a: [...formData.asignada_a, asignado] });
                              } else {
                                setFormData({ ...formData, asignada_a: formData.asignada_a.filter(a => a !== asignado) });
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
                          />
                          <span className="text-sm text-gray-700">{asignado}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {formData.asignada_a.length === 0 && usuarios.length > 0 && !(editingTarea && isReadOnly(editingTarea)) && (
                    <p className="mt-1 text-sm text-red-600">Debes seleccionar al menos un usuario</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado *
                  </label>
                  <div className={`p-3 border border-gray-300 rounded-lg ${editingTarea && isReadOnly(editingTarea) ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    {ESTADOS.map(estado => (
                      <label key={estado} className={`flex items-center space-x-2 py-1 ${editingTarea && isReadOnly(editingTarea) ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name="estado"
                          disabled={editingTarea ? isReadOnly(editingTarea) : false}
                          checked={formData.estado === estado}
                          onChange={() => setFormData({ ...formData, estado: estado as any })}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm text-gray-700 capitalize">{estado}</span>
                      </label>
                    ))}
                  </div>
                  {!formData.estado && !(editingTarea && isReadOnly(editingTarea)) && (
                    <p className="mt-1 text-sm text-red-600">Debes seleccionar un estado</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridad *
                  </label>
                  <div className={`p-3 border border-gray-300 rounded-lg ${editingTarea && isReadOnly(editingTarea) ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    {PRIORIDADES.map(p => (
                      <label key={p} className={`flex items-center space-x-2 py-1 ${editingTarea && isReadOnly(editingTarea) ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name="prioridad"
                          disabled={editingTarea ? isReadOnly(editingTarea) : false}
                          checked={formData.prioridad === p}
                          onChange={() => setFormData({ ...formData, prioridad: p as any })}
                          className="w-4 h-4 border-gray-300 focus:ring-blue-500 disabled:cursor-not-allowed"
                        />
                        <span className={`text-sm font-semibold capitalize ${
                          p === 'alta' ? 'text-red-700' :
                          p === 'media' ? 'text-orange-500' :
                          'text-green-700'
                        }`}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                      </label>
                    ))}
                  </div>
                  {!formData.prioridad && !(editingTarea && isReadOnly(editingTarea)) && (
                    <p className="mt-1 text-sm text-red-600">Debes seleccionar una prioridad</p>
                  )}
                </div>
              </div>

              {editingTarea?.fecha_cierre && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Fecha de cierre:</span>
                  <span className="text-sm text-gray-800 font-semibold">
                    {new Date(editingTarea.fecha_cierre).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}

              <div className={`relative ${editingTarea && isReadOnly(editingTarea) ? 'group' : ''}`}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imágenes (PNG, JPG, PDF) - Múltiples archivos permitidos
                </label>
                {editingTarea?.imagen_tarea && editingTarea.imagen_tarea.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-600 mb-2">Archivos actuales ({editingTarea.imagen_tarea.length}):</p>
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                      {editingTarea.imagen_tarea.map((url, index) => {
                        const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf');
                        return (
                          <div key={index} className="relative group/item rounded-lg overflow-hidden border border-gray-200 bg-gray-50" style={{ aspectRatio: '1' }}>
                            {isPdf ? (
                              <a href={url} target="_blank" rel="noopener noreferrer"
                                 className="flex flex-col items-center justify-center w-full h-full p-2 hover:bg-gray-100 transition-colors">
                                <svg className="w-8 h-8 text-red-500 mb-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
                                  <text x="7" y="17" fontSize="5" fill="white" fontWeight="bold">PDF</text>
                                </svg>
                                <span className="text-xs text-gray-600 text-center truncate w-full px-1">PDF {index + 1}</span>
                              </a>
                            ) : (
                              <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                <img
                                  src={url}
                                  alt={`Imagen ${index + 1}`}
                                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                  onError={(e) => {
                                    const t = e.currentTarget;
                                    t.style.display = 'none';
                                    if (t.parentElement) t.parentElement.innerHTML = `<div class="flex items-center justify-center w-full h-full text-xs text-gray-400 p-1">Imagen ${index + 1}</div>`;
                                  }}
                                />
                              </a>
                            )}
                            {!(editingTarea && isReadOnly(editingTarea)) && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const newImages = editingTarea.imagen_tarea.filter((_, i) => i !== index);
                                  const imagePath = url.split('/tareas-files/')[1];
                                  if (imagePath) {
                                    await supabase.storage.from('tareas-files').remove([imagePath]);
                                  }
                                  const { error } = await supabase
                                    .from('tareas')
                                    .update({ imagen_tarea: newImages })
                                    .eq('id', editingTarea.id);
                                  if (!error) {
                                    setEditingTarea({ ...editingTarea, imagen_tarea: newImages });
                                    await fetchTareas();
                                    showNotification('success', 'Imagen eliminada');
                                  }
                                }}
                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity shadow-md"
                                title="Eliminar"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className={`flex items-center gap-2 ${editingTarea && isReadOnly(editingTarea) ? 'opacity-60' : ''}`}>
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,application/pdf"
                    disabled={editingTarea ? isReadOnly(editingTarea) : false}
                    onChange={(e) => setFormData({ ...formData, imagenes_tarea: Array.from(e.target.files || []) })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <Upload className="w-5 h-5 text-gray-400" />
                </div>
                {formData.imagenes_tarea.length > 0 && (
                  <p className="mt-1 text-sm text-gray-600">
                    {formData.imagenes_tarea.length} archivo(s) seleccionado(s)
                  </p>
                )}
                {editingTarea && isReadOnly(editingTarea) && (
                  <div className="absolute inset-0 rounded-lg cursor-not-allowed flex items-center justify-end pr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">
                      No puedes modificar esta tarea
                    </span>
                  </div>
                )}
              </div>

              <div className={`relative ${editingTarea && isReadOnly(editingTarea) ? 'group' : ''}`}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Videos (MP4, MOV, AVI, etc.) - Múltiples archivos permitidos
                </label>
                {editingTarea?.video_tarea && editingTarea.video_tarea.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-600 mb-2">Archivos actuales ({editingTarea.video_tarea.length}):</p>
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                      {editingTarea.video_tarea.map((url, index) => (
                        <div key={index} className="relative group/item rounded-lg overflow-hidden border border-gray-200 bg-gray-900">
                          <video
                            src={url}
                            className="w-full object-cover"
                            style={{ height: '100px' }}
                            preload="metadata"
                            muted
                            onError={(e) => {
                              const t = e.currentTarget;
                              t.style.display = 'none';
                              if (t.parentElement) {
                                const div = document.createElement('div');
                                div.className = 'flex flex-col items-center justify-center w-full text-gray-400 p-2';
                                div.style.height = '100px';
                                div.innerHTML = `<svg class="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg><span class="text-xs">Video ${index + 1}</span>`;
                                t.parentElement.appendChild(div);
                              }
                            }}
                          />
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-50 transition-all"
                          >
                            <div className="w-8 h-8 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </a>
                          <span className="absolute bottom-1 left-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded">
                            Video {index + 1}
                          </span>
                          {!(editingTarea && isReadOnly(editingTarea)) && (
                            <button
                              type="button"
                              onClick={async () => {
                                const newVideos = editingTarea.video_tarea.filter((_, i) => i !== index);
                                const videoPath = url.split('/tareas-files/')[1];
                                if (videoPath) {
                                  await supabase.storage.from('tareas-files').remove([videoPath]);
                                }
                                const { error } = await supabase
                                  .from('tareas')
                                  .update({ video_tarea: newVideos })
                                  .eq('id', editingTarea.id);
                                if (!error) {
                                  setEditingTarea({ ...editingTarea, video_tarea: newVideos });
                                  await fetchTareas();
                                  showNotification('success', 'Video eliminado');
                                }
                              }}
                              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity shadow-md z-10"
                              title="Eliminar"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className={`flex items-center gap-2 ${editingTarea && isReadOnly(editingTarea) ? 'opacity-60' : ''}`}>
                  <input
                    type="file"
                    multiple
                    accept="video/*"
                    disabled={editingTarea ? isReadOnly(editingTarea) : false}
                    onChange={(e) => setFormData({ ...formData, videos_tarea: Array.from(e.target.files || []) })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <Upload className="w-5 h-5 text-gray-400" />
                </div>
                {formData.videos_tarea.length > 0 && (
                  <p className="mt-1 text-sm text-gray-600">
                    {formData.videos_tarea.length} archivo(s) seleccionado(s)
                  </p>
                )}
                {editingTarea && isReadOnly(editingTarea) && (
                  <div className="absolute inset-0 rounded-lg cursor-not-allowed flex items-center justify-end pr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">
                      No puedes modificar esta tarea
                    </span>
                  </div>
                )}
              </div>

              {isProcessing && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-green-900">
                          {processingMessage}
                        </span>
                        <span className="text-xs font-bold text-blue-600">
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {editingTarea && isReadOnly(editingTarea) ? 'Cerrar' : 'Cancelar'}
                </button>
                {!(editingTarea && isReadOnly(editingTarea)) && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Guardando...' : editingTarea ? 'Actualizar' : 'Crear'}
                  </button>
                )}
              </div>
            </form>

            {editingTarea && (
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                {isReadOnly(editingTarea) ? (
                  <div className="border rounded-lg p-4 mb-4 bg-green-50 border-green-200">
                    <p className="text-sm font-medium text-green-800">
                      Esta tarea está resuelta. No se pueden agregar nuevos comentarios.
                    </p>
                  </div>
                ) : null}
                <TaskComments tareaId={editingTarea.id} tareaAsignado={editingTarea.asignada_a} currentUser={currentUser} tareaEstado={editingTarea.estado} readOnly={isReadOnly(editingTarea)} />
              </div>
            )}
          </div>
        </div>
      )}

      {showUnreadWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Comentarios sin leer</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    La tarea tiene asociado comentarios no leídos de otro usuario/s, ponte en contacto con el/ellos para que se actualice su panel. De esta forma puedes cambiar el estado a <span className="font-semibold text-gray-800">"resuelta"</span> esta tarea.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowUnreadWarning(false)}
                  className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {blockDeleteUnread && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">No se puede eliminar la tarea</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Hay comentarios pendientes de lectura</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5">
                <p className="text-sm text-amber-900 mb-3">
                  La tarea <strong>"{blockDeleteUnread.tarea.nombre_tarea}"</strong> tiene comentarios que aún no fueron leídos por todos los usuarios asignados.
                </p>
                <p className="text-xs font-semibold text-amber-800 mb-2 uppercase tracking-wide">Usuarios con comentarios sin leer:</p>
                <ul className="space-y-1">
                  {blockDeleteUnread.usersWithUnread.map(user => (
                    <li key={user} className="flex items-center gap-2 text-sm text-amber-800">
                      <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                      {user}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                Todos los usuarios deben marcar los comentarios como leídos antes de poder eliminar la tarea.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setBlockDeleteUnread(null)}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmar Eliminación</h3>

              {isProcessing && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-green-900">
                      {processingMessage}
                    </span>
                    <span className="text-xs font-bold text-green-600">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <p className="text-gray-700 mb-6">
                ¿Estás seguro de eliminar la tarea <strong>"{confirmDelete.nombre_tarea}"</strong>?
                Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  disabled={isProcessing}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingDescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Vista de Descripción</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Tarea #{viewingDescription.id} - {viewingDescription.nombre_tarea}
                </p>
              </div>
              <button
                onClick={() => setViewingDescription(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div
                className="text-gray-800 leading-relaxed rich-content"
                dangerouslySetInnerHTML={{ __html: viewingDescription.descripcion_tarea }}
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
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => downloadTaskPDF(viewingDescription)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Descargar PDF
              </button>
              <button
                onClick={() => setViewingDescription(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}


      {isDownloading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <DownloadCloud className="w-16 h-16 text-green-600 mx-auto mb-4 animate-bounce" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Descargando Archivos</h3>
              <p className="text-gray-600 mb-6">{downloadMessage}</p>

              <div className="relative w-full bg-gray-200 rounded-full h-8 overflow-hidden shadow-inner">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300 ease-out flex items-center justify-center"
                  style={{ width: `${downloadProgress}%` }}
                >
                  {downloadProgress > 0 && (
                    <span className="text-white font-bold text-sm">
                      {Math.round(downloadProgress)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-500">
                Por favor, espera mientras descargamos tus archivos...
              </div>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 hover:opacity-80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}