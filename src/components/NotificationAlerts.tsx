import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, X, Check } from 'lucide-react';

interface Notification {
  id: string;
  usuario: string;
  tipo: 'nueva_tarea' | 'nuevo_comentario' | 'tarea_modificada' | 'comentario_eliminado' | 'tarea_eliminada';
  mensaje: string;
  tarea_id: number;
  comentario_id: string | null;
  leida: boolean;
  fecha_creacion: string;
  fecha_lectura: string | null;
  tarea?: {
    nombre_tarea: string;
    estado: string;
    uuid_publico: string;
  };
}

interface NotificationAlertsProps {
  currentUser: string;
  onNotificationClick?: (tareaId: number) => void;
}

export default function NotificationAlerts({ currentUser, onNotificationClick }: NotificationAlertsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [previousCount, setPreviousCount] = useState(0);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [showAlertTooltip, setShowAlertTooltip] = useState(false);
  const [isPlayingAlertSequence, setIsPlayingAlertSequence] = useState(false);
  const alertIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const initAudioContext = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API no soportada en este navegador');
        return null;
      }
      const ctx = new AudioContextClass();
      return ctx;
    } catch (error) {
      console.error('Error al crear AudioContext:', error);
      return null;
    }
  };

  const enableAudio = async () => {
    const ctx = initAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    setAudioContext(ctx);
    setAudioEnabled(true);

    playTestSound(ctx);
  };

  const playTestSound = (ctx: AudioContext) => {
    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      oscillator.start(now);
      oscillator.stop(now + 0.2);
    } catch (error) {
      console.error('Error al reproducir sonido de prueba:', error);
    }
  };

  const playNotificationSound = () => {
    if (!audioContext || !audioEnabled) return;

    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const playTone = (frequency: number, delay: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        const startTime = audioContext.currentTime + delay;
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.15);
      };

      playTone(800, 0);
      playTone(1000, 0.15);
    } catch (error) {
      console.error('Error al reproducir sonido de notificación:', error);
    }
  };

  const playAlertSequence = () => {
    if (!audioContext || !audioEnabled || isPlayingAlertSequence) return;

    if (alertIntervalRef.current) {
      clearInterval(alertIntervalRef.current);
    }

    setIsPlayingAlertSequence(true);
    setShowAlertTooltip(true);

    playNotificationSound();

    let count = 1;
    const maxCount = 5;

    alertIntervalRef.current = setInterval(() => {
      if (count >= maxCount) {
        if (alertIntervalRef.current) {
          clearInterval(alertIntervalRef.current);
          alertIntervalRef.current = null;
        }
        setIsPlayingAlertSequence(false);
        setShowAlertTooltip(false);
        return;
      }

      playNotificationSound();
      count++;
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (alertIntervalRef.current) {
        clearInterval(alertIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();

      // Suscripción a cambios en notificaciones con canal único
      const notificationsChannelId = `notifications-${currentUser}-${Date.now()}`;
      const notificationsChannel = supabase
        .channel(notificationsChannelId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notificaciones',
            filter: `usuario=eq.${currentUser}`
          },
          async (payload) => {
            console.log(`[${currentUser}] ⚡ Notificación recibida vía Realtime:`, payload);
            console.log(`[${currentUser}] Tipo de evento:`, payload.eventType);

            if (payload.eventType === 'INSERT' && payload.new) {
              const notif = payload.new as any;
              console.log(`[${currentUser}] ✅ Nueva notificación - Tipo: ${notif.tipo}, Mensaje: ${notif.mensaje}`);
            }

            // Intentar habilitar audio automáticamente si no está habilitado
            let currentAudioContext = audioContext;
            let currentAudioEnabled = audioEnabled;

            if (!audioEnabled) {
              try {
                if (!audioContext) {
                  const ctx = initAudioContext();
                  if (ctx) {
                    if (ctx.state === 'suspended') {
                      await ctx.resume().catch(() => {
                        console.log('Audio context suspended, waiting for user interaction');
                      });
                    }
                    setAudioContext(ctx);
                    setAudioEnabled(true);
                    currentAudioContext = ctx;
                    currentAudioEnabled = true;
                  }
                }
              } catch (error) {
                console.log('Audio auto-enable failed, requires user interaction');
              }
            }

            // Si es una nueva notificación, reproducir secuencia de sonido completa
            if (payload.eventType === 'INSERT') {
              if (currentAudioEnabled && currentAudioContext) {
                console.log(`[${currentUser}] 🔊 Reproduciendo secuencia de alertas...`);
                try {
                  if (currentAudioContext.state === 'suspended') {
                    await currentAudioContext.resume();
                  }

                  // Detener cualquier secuencia anterior
                  if (alertIntervalRef.current) {
                    clearInterval(alertIntervalRef.current);
                    alertIntervalRef.current = null;
                  }

                  setIsPlayingAlertSequence(true);
                  setShowAlertTooltip(true);
                  setShouldAnimate(true);

                  // Función para reproducir un tono usando el contexto actual
                  const playToneNow = (frequency: number, delay: number) => {
                    const oscillator = currentAudioContext.createOscillator();
                    const gainNode = currentAudioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(currentAudioContext.destination);

                    oscillator.frequency.value = frequency;
                    oscillator.type = 'sine';

                    const startTime = currentAudioContext.currentTime + delay;
                    gainNode.gain.setValueAtTime(0.3, startTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

                    oscillator.start(startTime);
                    oscillator.stop(startTime + 0.15);
                  };

                  // Reproducir primer sonido inmediatamente
                  playToneNow(800, 0);
                  playToneNow(1000, 0.15);

                  // Reproducir 4 veces más cada 2 segundos
                  let count = 1;
                  const maxCount = 5;

                  alertIntervalRef.current = setInterval(() => {
                    if (count >= maxCount) {
                      if (alertIntervalRef.current) {
                        clearInterval(alertIntervalRef.current);
                        alertIntervalRef.current = null;
                      }
                      setIsPlayingAlertSequence(false);
                      setShowAlertTooltip(false);
                      return;
                    }

                    if (currentAudioContext && currentAudioEnabled) {
                      playToneNow(800, 0);
                      playToneNow(1000, 0.15);
                    }
                    count++;
                  }, 2000);

                  console.log(`[${currentUser}] ✅ Secuencia de alertas iniciada (5 repeticiones)`);
                } catch (error) {
                  console.error(`[${currentUser}] ❌ Error al reproducir sonido:`, error);
                }
              } else {
                console.log(`[${currentUser}] ⚠️ Audio no habilitado o contexto no disponible`);
              }
            }

            fetchNotifications();
          }
        )
        .subscribe((status) => {
          console.log(`[${currentUser}] Estado de suscripción a notificaciones:`, status);
        });

      // Suscripción a cambios en tareas para detectar nuevas asignaciones
      const tasksChannelId = `tasks-notif-${currentUser}-${Date.now()}`;
      const tasksChannel = supabase
        .channel(tasksChannelId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tareas'
          },
          (payload) => {
            console.log(`[${currentUser}] Cambio en tareas detectado:`, payload);
            // Verificar si el usuario actual está en los asignados
            if (payload.new && typeof payload.new === 'object') {
              const newRecord = payload.new as { asignada_a?: string[] };
              const asignados = newRecord.asignada_a;
              if (Array.isArray(asignados) && asignados.includes(currentUser)) {
                console.log(`[${currentUser}] Tarea asignada al usuario actual, refrescando notificaciones`);
                setTimeout(() => fetchNotifications(), 500);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log(`[${currentUser}] Estado de suscripción a tareas:`, status);
        });

      // Suscripción a cambios en comentarios
      const commentsChannelId = `comments-notif-${currentUser}-${Date.now()}`;
      const commentsChannel = supabase
        .channel(commentsChannelId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tarea_comentarios'
          },
          (payload) => {
            console.log(`[${currentUser}] Cambio en comentarios detectado:`, payload);
            setTimeout(() => fetchNotifications(), 500);
          }
        )
        .subscribe((status) => {
          console.log(`[${currentUser}] Estado de suscripción a comentarios:`, status);
        });

      return () => {
        supabase.removeChannel(notificationsChannel);
        supabase.removeChannel(tasksChannel);
        supabase.removeChannel(commentsChannel);
      };
    }
  }, [currentUser]);

  useEffect(() => {
    if (!loading && notifications.length > previousCount) {
      // Reproducir sonido cuando hay nuevas notificaciones
      if (audioEnabled && previousCount >= 0) {
        playNotificationSound();
        setShouldAnimate(true);
      }
    }
    if (!loading) {
      setPreviousCount(notifications.length);
    }
  }, [notifications.length, loading, audioEnabled]);

  useEffect(() => {
    // Reproducir secuencia de alerta cuando hay notificaciones sin leer al iniciar
    if (!loading && notifications.length > 0 && audioEnabled && !isPlayingAlertSequence && previousCount === 0) {
      setTimeout(() => {
        playAlertSequence();
        setShouldAnimate(true);
      }, 500);
    }
  }, [loading, audioEnabled, notifications.length]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const { data: notificaciones, error } = await supabase
        .from('notificaciones')
        .select(`
          *,
          tareas:tarea_id (
            nombre_tarea,
            estado,
            uuid_publico,
            leida_por
          )
        `)
        .eq('usuario', currentUser)
        .eq('leida', false)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;

      const filtered = (notificaciones || []).filter((notif: any) => {
        // Si la tarea fue eliminada (notif.tareas es null), MOSTRAR la notificación
        // porque el usuario debe saber que la tarea fue eliminada
        if (!notif.tareas) {
          console.log(`[${currentUser}] Notificación de tarea eliminada:`, notif.mensaje);
          return true; // Mostrar notificaciones de tareas eliminadas
        }

        // Para tareas que existen:
        if (notif.tareas.estado === 'resuelta') return false;

        // Excluir si el usuario ya marcó la tarea como leída
        if (notif.tareas.leida_por && notif.tareas.leida_por.includes(currentUser)) {
          return false;
        }

        return true;
      });

      setNotifications(filtered.map((notif: any) => ({
        ...notif,
        tarea: notif.tareas
      })));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
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
    }
  };

  const markAllAsRead = async () => {
    try {
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
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Marcar como leída primero
    await markAsRead(notification.id);

    // Si la tarea aún existe, intentar abrirla
    if (notification.tarea && onNotificationClick) {
      onNotificationClick(notification.tarea_id);
    }
    // Si la tarea fue eliminada, solo se marca como leída (ya se hizo arriba)
  };

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'nueva_tarea':
        return '🎯';
      case 'tarea_modificada':
        return '📝';
      case 'nuevo_comentario':
        return '��';
      case 'comentario_eliminado':
        return '🗑️';
      case 'tarea_eliminada':
        return '❌';
      default:
        return '📢';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;

    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  };

  const unreadCount = notifications.length;

  const handleBellClick = () => {
    setShowPanel(!showPanel);
    setShouldAnimate(false);
    setShowAlertTooltip(false);
  };

  return (
    <div className="relative">
      <style>
        {`
          @keyframes shake-bell {
            0%, 100% { transform: rotate(0deg); }
            10%, 30%, 50%, 70%, 90% { transform: rotate(-15deg); }
            20%, 40%, 60%, 80% { transform: rotate(15deg); }
          }

          @keyframes bounce-bell {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }

          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
            50% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
          }

          @keyframes fade-in-bounce {
            0% {
              opacity: 0;
              transform: translateY(-10px);
            }
            50% {
              opacity: 1;
              transform: translateY(5px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes arrow-bounce {
            0%, 100% {
              transform: translateY(0) translateX(-50%);
            }
            50% {
              transform: translateY(-5px) translateX(-50%);
            }
          }

          .shake-animation {
            animation: shake-bell 0.6s ease-in-out infinite;
          }

          .bounce-animation {
            animation: bounce-bell 1s ease-in-out infinite;
          }

          .pulse-glow-animation {
            animation: pulse-glow 1.5s ease-out infinite;
          }

          .tooltip-animation {
            animation: fade-in-bounce 0.5s ease-out;
          }

          .arrow-animation {
            animation: arrow-bounce 1s ease-in-out infinite;
          }
        `}
      </style>
      <button
        onClick={handleBellClick}
        className={`relative p-2 hover:bg-gray-100 rounded-lg transition-colors ${
          shouldAnimate && unreadCount > 0 ? 'pulse-glow-animation' : ''
        }`}
        aria-label="Notificaciones"
      >
        <Bell
          className={`w-6 h-6 ${unreadCount > 0 ? 'text-red-600' : 'text-gray-600'} ${
            shouldAnimate && unreadCount > 0 ? 'shake-animation' : ''
          }`}
        />
        {unreadCount > 0 && (
          <>
            <span className={`absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center transform translate-x-1 -translate-y-1 ${
              shouldAnimate ? 'bounce-animation' : 'animate-pulse'
            }`}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
            {shouldAnimate && (
              <span className="absolute -top-1 -right-1 w-8 h-8 bg-red-500 rounded-full opacity-75 animate-ping" />
            )}
          </>
        )}
      </button>

      {showAlertTooltip && unreadCount > 0 && (
        <div className="absolute top-[-70px] left-1/2 transform -translate-x-1/2 z-[60] tooltip-animation">
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-2xl font-bold text-sm whitespace-nowrap">
            Tenes alertas pendientes!
          </div>
          <div className="absolute left-1/2 top-full transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-red-600 arrow-animation"></div>
        </div>
      )}

      {showPanel && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />

          <div className="absolute right-0 top-12 w-96 max-h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-red-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-red-600" />
                  Alertas del Sistema
                </h3>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {unreadCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-700 font-semibold">
                    {unreadCount} {unreadCount === 1 ? 'alerta' : 'alertas'} sin leer
                  </span>
                  <button
                    onClick={markAllAsRead}
                    className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Marcar todas como leídas
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  Cargando alertas...
                </div>
              ) : unreadCount === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-gray-600 font-medium">No tienes alertas pendientes</p>
                  <p className="text-sm text-gray-500 mt-1">Estás al día con tus tareas</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 hover:bg-red-50 transition-colors cursor-pointer border-l-4 border-red-600"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">
                          {getNotificationIcon(notification.tipo)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {notification.mensaje}
                          </p>

                          {notification.tarea && (
                            <div className="bg-red-50 rounded px-2 py-1 mb-2">
                              <p className="text-xs font-semibold text-red-900 truncate">
                                📋 {notification.tarea.nombre_tarea}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.fecha_creacion)}
                            </span>

                            {notification.tarea?.uuid_publico && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationClick(notification);
                                }}
                                className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-medium"
                              >
                                Ver tarea
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
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
