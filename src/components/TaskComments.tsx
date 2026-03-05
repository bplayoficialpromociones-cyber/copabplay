import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import LinkifiedText from './LinkifiedText';
import RichTextEditor from './RichTextEditor';
import { MessageCircle, Reply, Edit2, Search, X, Check, Calendar, User, Trash2, Archive, ChevronDown, ChevronUp } from 'lucide-react';

interface Comment {
  id: string;
  tarea_id: number;
  autor: string;
  contenido: string;
  parent_comment_id: string | null;
  fecha_creacion: string;
  fecha_edicion: string | null;
  estado: 'pendiente' | 'resuelto';
  resuelto_por: string | null;
  resuelto_fecha: string | null;
  eliminado: boolean;
  fecha_eliminacion: string | null;
  eliminado_por: string | null;
  leido_por: string[];
}

interface TaskCommentsProps {
  tareaId: number;
  tareaAsignado: string[];
  currentUser: string;
  tareaEstado?: 'pendiente' | 'resuelta' | 'con bugs' | 'en revisión';
  readOnly?: boolean;
}

const stripHtml = (html: string) => {
  if (!html) return '';
  const stripped = html.replace(/<[^>]*>/g, '').trim();
  const txt = document.createElement('textarea');
  txt.innerHTML = stripped;
  return txt.value;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface CommentItemProps {
  comment: Comment;
  level?: number;
  buildCommentTree: (parentId: string | null) => Comment[];
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  newComment: string;
  setNewComment: (comment: string) => void;
  addComment: (parentId: string | null) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string, autor: string) => Promise<void>;
  toggleReadStatus: (commentId: string) => Promise<void>;
  tareaAsignado: string[];
  currentUser: string;
  isProcessing: boolean;
  progressMessage: string;
  progressPercent: number;
  readOnly?: boolean;
}

const CommentItem = React.memo(({
  comment,
  level = 0,
  buildCommentTree,
  replyingTo,
  setReplyingTo,
  newComment,
  setNewComment,
  addComment,
  updateComment,
  deleteComment,
  toggleReadStatus,
  tareaAsignado,
  currentUser,
  isProcessing,
  progressMessage,
  progressPercent,
  readOnly = false
}: CommentItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(false);

  const replies = buildCommentTree(comment.id);
  const isReplying = replyingTo === comment.id;

  const canReply = !readOnly && level === 0 && replies.length === 0 && comment.autor !== currentUser;
  const canEdit = !readOnly && comment.autor === currentUser;

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditContent(comment.contenido);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent('');
  };

  const handleSaveEdit = async () => {
    await updateComment(comment.id, editContent);
    setIsEditing(false);
    setEditContent('');
  };

  return (
    <div className={`${level > 0 ? 'ml-8 mt-3 border-l-2 border-green-200 pl-4' : 'mt-4'}`}>
      <div className="rounded-lg p-4 border-2 bg-white border-gray-200">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
              <User className="w-3 h-3" />
              {comment.autor}
            </span>

            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              {formatDate(comment.fecha_creacion)}
            </span>
            {comment.fecha_edicion && (
              <span className="text-xs text-gray-400 italic">
                (editado {formatDate(comment.fecha_edicion)})
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {comment.autor !== currentUser && !readOnly && (
              <button
                onClick={() => toggleReadStatus(comment.id)}
                className={`p-1 rounded transition-colors ${
                  (comment.leido_por || []).includes(currentUser)
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
                title={(comment.leido_por || []).includes(currentUser) ? 'Marcar como no leído' : 'Marcar como leído'}
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            {canReply && (
              <button
                onClick={() => {
                  setReplyingTo(comment.id);
                  setNewComment('');
                }}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Responder"
              >
                <Reply className="w-4 h-4" />
              </button>
            )}
            {canEdit && (
              <>
                <button
                  onClick={handleStartEdit}
                  disabled={isProcessing}
                  className="p-1 text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmDeleteComment(true)}
                  disabled={isProcessing}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <RichTextEditor
              value={editContent}
              onChange={(html) => setEditContent(html)}
              placeholder="Escribe tu comentario..."
              minHeight={100}
            />
            {isProcessing && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-green-800">{progressMessage}</span>
                    <span className="text-blue-600 font-semibold">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={isProcessing}
                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                {isProcessing ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isProcessing}
                className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div
            className="text-gray-800 leading-relaxed rich-content"
            dangerouslySetInnerHTML={{ __html: comment.contenido }}
            onClick={(e) => {
              const anchor = (e.target as HTMLElement).closest('a[data-url="true"]') as HTMLAnchorElement | null;
              if (anchor) { e.preventDefault(); window.open(anchor.href, '_blank', 'noopener,noreferrer'); }
            }}
          />
        )}

        {isReplying && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Reply className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">
                Respondiendo a {comment.autor} como {currentUser}
              </span>
            </div>
            <div className="space-y-2">
              <RichTextEditor
                value={newComment}
                onChange={(html) => setNewComment(html)}
                placeholder="Escribe tu respuesta..."
                minHeight={90}
              />
              {isProcessing && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-green-800">{progressMessage}</span>
                      <span className="text-blue-600 font-semibold">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => addComment(comment.id)}
                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Responder
                </button>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setNewComment('');
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {replies.length > 0 && (
        <div className="mt-2">
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              level={level + 1}
              buildCommentTree={buildCommentTree}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              newComment={newComment}
              setNewComment={setNewComment}
              addComment={addComment}
              updateComment={updateComment}
              deleteComment={deleteComment}
              toggleReadStatus={toggleReadStatus}
              tareaAsignado={tareaAsignado}
              currentUser={currentUser}
              isProcessing={isProcessing}
              progressMessage={progressMessage}
              progressPercent={progressPercent}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {confirmDeleteComment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar comentario</h3>
              <p className="text-gray-600 mb-6 text-sm">
                ¿Estás seguro de que deseas eliminar este comentario? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDeleteComment(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setConfirmDeleteComment(false);
                    deleteComment(comment.id, currentUser);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

CommentItem.displayName = 'CommentItem';

function TaskComments({ tareaId, tareaAsignado, currentUser, tareaEstado, readOnly = false }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [deletedComments, setDeletedComments] = useState<Comment[]>([]);
  const [showDeletedComments, setShowDeletedComments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [usuarios, setUsuarios] = useState<string[]>([]);

  useEffect(() => {
    fetchComments();
    checkDeletedComments();
    fetchUsuarios();

    const comentariosChannel = supabase
      .channel(`task-comments-${tareaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tarea_comentarios',
          filter: `tarea_id=eq.${tareaId}`
        },
        (payload) => {
          console.log('Comentario actualizado en tiempo real:', payload);
          fetchComments();
          checkDeletedComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(comentariosChannel);
    };
  }, [tareaId]);

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

  const checkDeletedComments = async () => {
    try {
      const { count, error } = await supabase
        .from('tarea_comentarios')
        .select('*', { count: 'exact', head: true })
        .eq('tarea_id', tareaId)
        .eq('eliminado', true);

      if (error) throw error;
      if (count && count > 0) {
        setDeletedComments(new Array(count).fill({} as Comment));
      }
    } catch (error) {
      console.error('Error checking deleted comments:', error);
    }
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tarea_comentarios')
        .select('*')
        .eq('tarea_id', tareaId)
        .eq('eliminado', false)
        .order('fecha_creacion', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedComments = async () => {
    try {
      setLoadingDeleted(true);
      const { data, error } = await supabase
        .from('tarea_comentarios')
        .select('*')
        .eq('tarea_id', tareaId)
        .eq('eliminado', true)
        .order('fecha_eliminacion', { ascending: false });

      if (error) throw error;
      setDeletedComments(data || []);
    } catch (error) {
      console.error('Error fetching deleted comments:', error);
    } finally {
      setLoadingDeleted(false);
    }
  };

  const addComment = async (parentId: string | null = null) => {
    if (!stripHtml(newComment)) return;

    try {
      setIsProcessing(true);
      setProgressMessage('Guardando comentario...');
      setProgressPercent(25);

      const { data: newCommentData, error } = await supabase
        .from('tarea_comentarios')
        .insert([{
          tarea_id: tareaId,
          autor: currentUser,
          contenido: newComment,
          parent_comment_id: parentId
        }])
        .select()
        .single();

      if (error) throw error;

      setProgressMessage('Sincronizando comentarios...');
      setProgressPercent(50);

      await new Promise(resolve => setTimeout(resolve, 2000));

      setProgressMessage('Enviando alertas...');
      setProgressPercent(75);

      const otrosUsuarios = tareaAsignado.filter(usuario => usuario !== currentUser);

      if (otrosUsuarios.length > 0) {
        const notifications = otrosUsuarios.map(usuario => ({
          usuario,
          tipo: 'nuevo_comentario' as const,
          mensaje: `${currentUser} agregó un comentario en una tarea asignada a ti`,
          tarea_id: tareaId,
          comentario_id: newCommentData.id,
          leida: false
        }));

        const { data: insertedNotifications, error: notifError } = await supabase
          .from('notificaciones')
          .insert(notifications)
          .select();

        if (!notifError) {
          console.log(`Notificaciones de alerta creadas para: ${otrosUsuarios.join(', ')}`);
        }

        setProgressMessage('Enviando emails...');
        setProgressPercent(90);

        if (insertedNotifications) {
          const { data: tareaData } = await supabase
            .from('tareas')
            .select('nombre_tarea, proyecto')
            .eq('id', tareaId)
            .maybeSingle();

          for (const notif of insertedNotifications) {
            try {
              const emailPayload = {
                usuario: notif.usuario,
                tipo: notif.tipo,
                mensaje: notif.mensaje,
                tarea_id: notif.tarea_id,
                notificacion_id: notif.id,
                tarea_nombre: tareaData?.nombre_tarea,
                proyecto: tareaData?.proyecto,
                comentario_texto: stripHtml(newComment).substring(0, 200),
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
                console.error(`Error sending email to ${notif.usuario}`);
              } else {
                console.log(`Email sent successfully to ${notif.usuario}`);
              }
            } catch (emailError) {
              console.error(`Failed to send email to ${notif.usuario}:`, emailError);
            }
          }
        }
      }

      setProgressMessage('Finalizando...');
      setProgressPercent(100);

      setNewComment('');
      setReplyingTo(null);
      await fetchComments();

      setTimeout(() => {
        setIsProcessing(false);
        setProgressMessage('');
        setProgressPercent(0);
      }, 500);
    } catch (error) {
      console.error('Error adding comment:', error);
      setIsProcessing(false);
      setProgressMessage('');
      setProgressPercent(0);
    }
  };

  const updateComment = async (commentId: string, content: string) => {
    if (!stripHtml(content)) return;

    try {
      setIsProcessing(true);
      setProgressMessage('Actualizando comentario...');
      setProgressPercent(25);

      const { data: commentData } = await supabase
        .from('tarea_comentarios')
        .select('autor')
        .eq('id', commentId)
        .maybeSingle();

      const { error } = await supabase
        .from('tarea_comentarios')
        .update({
          contenido: content,
          fecha_edicion: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      setProgressMessage('Actualizando comentarios en tiempo real...');
      setProgressPercent(40);

      // Esperar a que el sistema de realtime propague los cambios a todos los usuarios
      await new Promise(resolve => setTimeout(resolve, 1500));

      setProgressMessage('Creando notificaciones...');
      setProgressPercent(50);

      const notifications = tareaAsignado
        .filter(usuario => usuario !== commentData?.autor)
        .map(usuario => ({
          usuario,
          tipo: 'nuevo_comentario' as const,
          mensaje: `${commentData?.autor} modificó un comentario en una tarea asignada a ti`,
          tarea_id: tareaId,
          comentario_id: commentId,
          leida: false
        }));

      if (notifications.length > 0) {
        const { data: insertedNotifications, error: notifError } = await supabase
          .from('notificaciones')
          .insert(notifications)
          .select();

        setProgressMessage('Enviando emails...');
        setProgressPercent(75);

        if (!notifError && insertedNotifications) {
          const { data: tareaData } = await supabase
            .from('tareas')
            .select('nombre_tarea, proyecto')
            .eq('id', tareaId)
            .maybeSingle();

          for (const notif of insertedNotifications) {
            try {
              const emailPayload = {
                usuario: notif.usuario,
                tipo: notif.tipo,
                mensaje: notif.mensaje,
                tarea_id: notif.tarea_id,
                notificacion_id: notif.id,
                tarea_nombre: tareaData?.nombre_tarea,
                proyecto: tareaData?.proyecto,
                comentario_texto: stripHtml(content).substring(0, 200),
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
                console.error(`Error sending email to ${notif.usuario}`);
              } else {
                console.log(`Email sent successfully to ${notif.usuario}`);
              }
            } catch (emailError) {
              console.error(`Failed to send email to ${notif.usuario}:`, emailError);
            }
          }
        }
      }

      setProgressMessage('Finalizando...');
      setProgressPercent(100);

      await fetchComments();

      setTimeout(() => {
        setIsProcessing(false);
        setProgressMessage('');
        setProgressPercent(0);
      }, 500);
    } catch (error) {
      console.error('Error updating comment:', error);
      setIsProcessing(false);
      setProgressMessage('');
      setProgressPercent(0);
    }
  };

  const deleteComment = async (commentId: string, usuario: string) => {
    try {
      setIsProcessing(true);
      setProgressMessage('Eliminando comentario...');
      setProgressPercent(25);

      const { data: commentData } = await supabase
        .from('tarea_comentarios')
        .select('contenido, autor')
        .eq('id', commentId)
        .maybeSingle();

      const { error } = await supabase
        .from('tarea_comentarios')
        .update({
          eliminado: true,
          fecha_eliminacion: new Date().toISOString(),
          eliminado_por: usuario
        })
        .eq('id', commentId);

      if (error) throw error;

      setProgressMessage('Sincronizando comentarios...');
      setProgressPercent(50);

      await new Promise(resolve => setTimeout(resolve, 2000));

      setProgressMessage('Enviando alertas...');
      setProgressPercent(75);

      const otrosUsuarios = tareaAsignado.filter(u => u !== usuario);

      if (otrosUsuarios.length > 0) {
        const notifications = otrosUsuarios.map(u => ({
          usuario: u,
          tipo: 'comentario_eliminado' as const,
          mensaje: `${usuario} eliminó un comentario en una tarea asignada a ti`,
          tarea_id: tareaId,
          comentario_id: commentId,
          leida: false
        }));

        const { data: insertedNotifications, error: notifError } = await supabase
          .from('notificaciones')
          .insert(notifications)
          .select();

        if (!notifError) {
          console.log(`Notificaciones de alerta creadas para: ${otrosUsuarios.join(', ')}`);
        }

        setProgressMessage('Enviando emails...');
        setProgressPercent(90);

        if (insertedNotifications) {
          const { data: tareaData } = await supabase
            .from('tareas')
            .select('nombre_tarea, proyecto')
            .eq('id', tareaId)
            .maybeSingle();

          for (const notif of insertedNotifications) {
            try {
              const emailPayload = {
                usuario: notif.usuario,
                tipo: 'comentario_eliminado' as const,
                mensaje: notif.mensaje,
                tarea_id: notif.tarea_id,
                notificacion_id: notif.id,
                tarea_nombre: tareaData?.nombre_tarea,
                proyecto: tareaData?.proyecto,
                comentario_texto: commentData?.contenido?.substring(0, 200),
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
                console.error(`Error sending email to ${notif.usuario}`);
              } else {
                console.log(`Email sent successfully to ${notif.usuario}`);
              }
            } catch (emailError) {
              console.error(`Failed to send email to ${notif.usuario}:`, emailError);
            }
          }
        }
      }

      setProgressMessage('Finalizando...');
      setProgressPercent(100);

      await fetchComments();
      if (showDeletedComments) {
        await fetchDeletedComments();
      }

      setTimeout(() => {
        setIsProcessing(false);
        setProgressMessage('');
        setProgressPercent(0);
      }, 500);
    } catch (error) {
      console.error('Error deleting comment:', error);
      setIsProcessing(false);
      setProgressMessage('');
      setProgressPercent(0);
    }
  };

  const toggleReadStatus = async (commentId: string) => {
    try {
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      const leidoPor = comment.leido_por || [];
      const isCurrentlyRead = leidoPor.includes(currentUser);

      const updatedLeidoPor = isCurrentlyRead
        ? leidoPor.filter(user => user !== currentUser)
        : [...leidoPor, currentUser];

      const { error } = await supabase
        .from('tarea_comentarios')
        .update({ leido_por: updatedLeidoPor })
        .eq('id', commentId);

      if (error) throw error;

      await fetchComments();
    } catch (error) {
      console.error('Error toggling read status:', error);
    }
  };

  const buildCommentTree = useCallback((parentId: string | null = null): Comment[] => {
    const filtered = comments.filter(comment => {
      const matchesSearch = searchTerm === '' ||
        stripHtml(comment.contenido).toLowerCase().includes(searchTerm.toLowerCase()) ||
        comment.autor.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = dateFilter === '' ||
        comment.fecha_creacion.startsWith(dateFilter);

      const matchesAuthor = authorFilter === '' ||
        comment.autor === authorFilter;

      return matchesSearch && matchesDate && matchesAuthor;
    });
    return filtered.filter(comment => comment.parent_comment_id === parentId);
  }, [comments, searchTerm, dateFilter, authorFilter]);

  const topLevelComments = buildCommentTree(null);
  const hasFilters = searchTerm || dateFilter || authorFilter;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600" />
          Comentarios ({comments.length})
        </h4>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Search className="w-4 h-4" />
          Buscar Comentarios
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Palabra clave
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en comentarios..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Autor
            </label>
            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            >
              <option value="">Todos los autores</option>
              {usuarios.map(autor => (
                <option key={autor} value={autor}>{autor}</option>
              ))}
            </select>
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={() => {
              setSearchTerm('');
              setDateFilter('');
              setAuthorFilter('');
            }}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            <X className="w-4 h-4" />
            Limpiar filtros
          </button>
        )}
      </div>

      {!replyingTo && tareaEstado !== 'resuelta' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Nuevo Comentario ({currentUser})
          </label>
          <RichTextEditor
            value={newComment}
            onChange={(html) => setNewComment(html)}
            placeholder="Escribe un comentario..."
            minHeight={180}
          />
          {isProcessing && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-green-800">{progressMessage}</span>
                  <span className="text-blue-600 font-semibold">{progressPercent}%</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => addComment()}
            disabled={!stripHtml(newComment) || isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MessageCircle className="w-4 h-4" />
            {isProcessing ? 'Procesando...' : 'Agregar Comentario'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Cargando comentarios...
          </div>
        ) : topLevelComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
            {hasFilters ? (
              <>
                <Search className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No se encontraron comentarios con los filtros aplicados</p>
              </>
            ) : (
              <>
                <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No hay comentarios todavía</p>
                <p className="text-sm mt-1">Sé el primero en comentar</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {topLevelComments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                buildCommentTree={buildCommentTree}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                newComment={newComment}
                setNewComment={setNewComment}
                addComment={addComment}
                updateComment={updateComment}
                deleteComment={deleteComment}
                toggleReadStatus={toggleReadStatus}
                tareaAsignado={tareaAsignado}
                currentUser={currentUser}
                isProcessing={isProcessing}
                progressMessage={progressMessage}
                progressPercent={progressPercent}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </div>

      {deletedComments.length > 0 || showDeletedComments ? (
        <div className="mt-6 border-t pt-6">
          <button
            onClick={() => {
              setShowDeletedComments(!showDeletedComments);
              if (!showDeletedComments && deletedComments.length === 0) {
                fetchDeletedComments();
              }
            }}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors mb-4"
          >
            <Archive className="w-5 h-5 text-orange-600" />
            <span>Comentarios Eliminados ({deletedComments.length})</span>
            {showDeletedComments ? (
              <ChevronUp className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-auto" />
            )}
          </button>

          {showDeletedComments && (
            <div className="space-y-4">
              {loadingDeleted ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                  Cargando comentarios eliminados...
                </div>
              ) : deletedComments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                  <Archive className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No hay comentarios eliminados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deletedComments.map((comment) => (
                    <div key={comment.id} className="bg-red-50 border-2 border-red-200 rounded-lg p-4 opacity-75">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                            <User className="w-3 h-3" />
                            {comment.autor}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {formatDate(comment.fecha_creacion)}
                          </span>
                          {comment.fecha_eliminacion && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs font-semibold">
                              <Trash2 className="w-3 h-3" />
                              Eliminado el {formatDate(comment.fecha_eliminacion)}
                              {comment.eliminado_por && ` por ${comment.eliminado_por}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-gray-800 leading-relaxed rich-content" dangerouslySetInnerHTML={{ __html: comment.contenido }} onClick={(e) => { const anchor = (e.target as HTMLElement).closest('a[data-url="true"]') as HTMLAnchorElement | null; if (anchor) { e.preventDefault(); window.open(anchor.href, '_blank', 'noopener,noreferrer'); } }} />
                      <p className="text-xs text-red-600 mt-2 font-semibold">
                        Este comentario fue eliminado y solo es visible en esta vista de recuperación
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default React.memo(TaskComments);
