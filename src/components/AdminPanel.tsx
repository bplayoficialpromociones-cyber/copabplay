import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Plus, Save, Trash2, RefreshCw, Search, LogOut, Trophy, FileText, Settings, Users, Video, X, Factory, DollarSign, Gamepad2, Archive, LayoutDashboard, Menu, ClipboardCheck, UserCheck, UserPlus, CheckSquare, ShieldCheck, Mail, Wallet, Banknote, Rss, List } from 'lucide-react';
import { supabase, RankingPlayer } from '../lib/supabase';

const PrizesManagement = lazy(() => import('./PrizesManagement'));
const FooterEditor = lazy(() => import('./FooterEditor'));
const AccountSettings = lazy(() => import('./AccountSettings'));
const StreamContentManagement = lazy(() => import('./StreamContentManagement'));
const ManufacturerLandingAdmin = lazy(() => import('./ManufacturerLandingAdmin').then(m => ({ default: m.ManufacturerLandingAdmin })));
const ExchangeRateManagement = lazy(() => import('./ExchangeRateManagement'));
const GamesPointsManagement = lazy(() => import('./GamesPointsManagement'));
const MonthlyWinnerManagement = lazy(() => import('./MonthlyWinnerManagement'));
const RankingHistoryManagement = lazy(() => import('./RankingHistoryManagement'));
const DashboardOverview = lazy(() => import('./DashboardOverview'));
const EditorDashboard = lazy(() => import('./EditorDashboard'));
const TournamentAudit = lazy(() => import('./TournamentAudit'));
const HistoricalPlayers = lazy(() => import('./HistoricalPlayers'));
const PotentialClientsManagement = lazy(() => import('./PotentialClientsManagement').then(m => ({ default: m.PotentialClientsManagement })));
const GiroGanadorManagement = lazy(() => import('./GiroGanadorManagement').then(m => ({ default: m.GiroGanadorManagement })));
const BotSubmissionsManagement = lazy(() => import('./BotSubmissionsManagement').then(m => ({ default: m.BotSubmissionsManagement })));
const TasksManagement = lazy(() => import('./TasksManagement'));
const NotificationAlerts = lazy(() => import('./NotificationAlerts'));
const UserManagement = lazy(() => import('./UserManagement'));
const EmailChangeTest = lazy(() => import('./EmailChangeTest'));
const EmailIconsManagement = lazy(() => import('./EmailIconsManagement'));
const GastosManagement = lazy(() => import('./GastosManagement'));
const SueldosManagement = lazy(() => import('./SueldosManagement'));
const ServiciosUSDManagement = lazy(() => import('./ServiciosUSDManagement'));
const LupaNoticiasPanel = lazy(() => import('./LupaNoticiasPanel'));
const LupaImportLog = lazy(() => import('./LupaImportLog'));

interface AdminPanelProps {
  onLogout: () => void;
  currentUser: string;
  initialSection?: string;
}

type TabType = 'overview' | 'rankings' | 'prizes' | 'games' | 'winner' | 'history' | 'historical' | 'footer' | 'content' | 'manufacturers' | 'clients' | 'giro' | 'bot' | 'exchange' | 'account' | 'audit' | 'tareas' | 'users' | 'emailtest' | 'emailicons' | 'gastos' | 'sueldos' | 'servicios_usd' | 'lupa' | 'lupa_log';

export default function AdminPanel({ onLogout, currentUser, initialSection }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>((initialSection as TabType) || 'overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openTareaId, setOpenTareaId] = useState<number | undefined>(undefined);
  const [userRole, setUserRole] = useState<'super_admin' | 'editor'>('editor');
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [lupaNotiasCount, setLupaNoticiasCount] = useState(0);

  const fetchLupaCount = useCallback(async () => {
    const { count } = await supabase
      .from('lupa_noticias')
      .select('*', { count: 'exact', head: true })
      .eq('leida', false);
    setLupaNoticiasCount(count || 0);
  }, []);

  useEffect(() => {
    fetchLupaCount();
    const interval = setInterval(fetchLupaCount, 60000);
    return () => clearInterval(interval);
  }, [fetchLupaCount]);

  const changeTab = (tab: TabType) => {
    setActiveTab(tab);
    if (tab !== 'tareas') {
      setOpenTareaId(undefined);
    }
    const newPath = tab === 'overview' ? '/admin' : `/admin/${tab}`;
    window.history.pushState({}, '', newPath);
  };
  const [rankings, setRankings] = useState<RankingPlayer[]>([]);
  const [filteredRankings, setFilteredRankings] = useState<RankingPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', province: '', usuario_bplay: '', points: '' });
  const [pointsAdjustments, setPointsAdjustments] = useState<{ [key: string]: string }>({});
  const [massAdjustment, setMassAdjustment] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());

  const fetchRankings = async () => {
    try {
      const { data, error } = await supabase
        .from('rankings')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      if (data) {
        setRankings(data);
        setFilteredRankings(data);
      }
    } catch (error) {
      console.error('Error al obtener rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
    fetchUserPermissions();

    // Check for tarea_id in URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tareaId = urlParams.get('tarea_id');
    if (tareaId) {
      setOpenTareaId(parseInt(tareaId, 10));
      setActiveTab('tareas');
    }
  }, []);

  const fetchUserPermissions = async () => {
    try {
      const userEmail = localStorage.getItem('admin_email');
      const role = localStorage.getItem('admin_role') as 'super_admin' | 'editor';

      if (!userEmail || !role) {
        console.error('No user email or role found');
        return;
      }

      setUserRole(role);

      if (role === 'editor') {
        const { data, error } = await supabase
          .from('admin_permissions')
          .select('seccion')
          .eq('email', userEmail);

        if (error) {
          console.error('Error fetching permissions:', error);
          return;
        }

        setUserPermissions(data?.map(p => p.seccion) || []);
      }
    } catch (error) {
      console.error('Error in fetchUserPermissions:', error);
    }
  };

  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        onLogout();
      }, 600000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [onLogout]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredRankings(rankings);
    } else {
      const filtered = rankings.filter((player) =>
        player.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (player.province && player.province.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (player.usuario_bplay && player.usuario_bplay.toLowerCase().includes(searchTerm.toLowerCase())) ||
        player.position.toString().includes(searchTerm) ||
        player.points.toString().includes(searchTerm)
      );
      setFilteredRankings(filtered);
    }
  }, [searchTerm, rankings]);

  const updatePlayer = async (id: string, field: keyof RankingPlayer, value: string | number) => {
    setRankings(rankings.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Sort by points and recalculate positions
      const sorted = [...rankings].sort((a, b) => b.points - a.points);
      const updated = sorted.map((player, index) => ({
        ...player,
        position: index + 1
      }));

      // Save all players with updated positions
      for (const player of updated) {
        const { error } = await supabase
          .from('rankings')
          .update({
            player_name: player.player_name,
            province: player.province,
            usuario_bplay: player.usuario_bplay,
            points: player.points,
            position: player.position
          })
          .eq('id', player.id);

        if (error) throw error;
      }

      // Update local state
      setRankings(updated);
      alert('¡Rankings guardados y posiciones recalculadas exitosamente!');
    } catch (error) {
      console.error('Error al guardar rankings:', error);
      alert('Error al guardar rankings. Revise la consola para más detalles.');
    } finally {
      setSaving(false);
    }
  };

  const recalculatePositions = async () => {
    setSaving(true);
    try {
      const sorted = [...rankings].sort((a, b) => b.points - a.points);
      const updated = sorted.map((player, index) => ({
        ...player,
        position: index + 1
      }));

      for (const player of updated) {
        const { error } = await supabase
          .from('rankings')
          .update({
            player_name: player.player_name,
            province: player.province,
            usuario_bplay: player.usuario_bplay,
            points: player.points,
            position: player.position
          })
          .eq('id', player.id);

        if (error) throw error;
      }

      setRankings(updated);
      alert('¡Posiciones recalculadas y guardadas exitosamente!');
    } catch (error) {
      console.error('Error al recalcular posiciones:', error);
      alert('Error al recalcular posiciones. Revise la consola para más detalles.');
    } finally {
      setSaving(false);
    }
  };

  const openAddPlayerModal = () => {
    setNewPlayer({ name: '', province: '', usuario_bplay: '', points: '' });
    setShowAddModal(true);
  };

  const closeAddPlayerModal = () => {
    setShowAddModal(false);
    setNewPlayer({ name: '', province: '', usuario_bplay: '', points: '' });
  };

  const addPlayer = async () => {
    if (!newPlayer.name.trim() || !newPlayer.province.trim() || !newPlayer.usuario_bplay.trim() || !newPlayer.points.trim()) {
      alert('Todos los campos son obligatorios');
      return;
    }

    const points = parseInt(newPlayer.points);
    if (isNaN(points) || points < 0) {
      alert('Los puntos deben ser un número válido mayor o igual a 0');
      return;
    }

    try {
      const sortedRankings = [...rankings].sort((a, b) => b.points - a.points);
      let calculatedPosition = sortedRankings.length + 1;

      for (let i = 0; i < sortedRankings.length; i++) {
        if (points > sortedRankings[i].points) {
          calculatedPosition = i + 1;
          break;
        }
      }

      const { data, error } = await supabase
        .from('rankings')
        .insert({
          player_name: newPlayer.name.trim(),
          province: newPlayer.province.trim(),
          usuario_bplay: newPlayer.usuario_bplay.trim(),
          points: points,
          position: calculatedPosition
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const now = new Date();
        const monthName = now.toLocaleDateString('es-ES', { month: 'long' });
        const monthCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        const year = now.getFullYear();

        await supabase
          .from('historical_players')
          .insert({
            player_name: newPlayer.name.trim(),
            usuario_bplay: newPlayer.usuario_bplay.trim(),
            province: newPlayer.province.trim(),
            first_participated_month: monthCapitalized,
            first_participated_year: year,
            last_participated_month: monthCapitalized,
            last_participated_year: year,
            total_participations: 1
          })
          .select()
          .single()
          .then(({ error: histError }) => {
            if (histError && histError.code !== '23505') {
              console.error('Error adding to historical players:', histError);
            }
          });

        await fetchRankings();
        closeAddPlayerModal();
        alert('¡Jugador agregado exitosamente!');
      }
    } catch (error) {
      console.error('Error al agregar jugador:', error);
      alert('Error al agregar jugador. Revise la consola para más detalles.');
    }
  };

  const adjustPoints = async (playerId: string, amount: number) => {
    if (amount === 0) return;

    try {
      const player = rankings.find(r => r.id === playerId);
      if (!player) return;

      const newPoints = Math.max(0, player.points + amount);

      // Update the database
      const { error } = await supabase
        .from('rankings')
        .update({ points: newPoints })
        .eq('id', playerId);

      if (error) throw error;

      // Update local state with new points
      const updatedRankings = rankings.map(r =>
        r.id === playerId ? { ...r, points: newPoints } : r
      );

      // Sort by points and recalculate positions
      const sorted = [...updatedRankings].sort((a, b) => b.points - a.points);
      const withNewPositions = sorted.map((player, index) => ({
        ...player,
        position: index + 1
      }));

      // Update positions in database
      for (const player of withNewPositions) {
        await supabase
          .from('rankings')
          .update({ position: player.position })
          .eq('id', player.id);
      }

      // Update local state
      setRankings(withNewPositions);
      setPointsAdjustments({ ...pointsAdjustments, [playerId]: '' });

    } catch (error) {
      console.error('Error adjusting points:', error);
      alert('Error al ajustar puntos');
    }
  };

  const massAdjustPoints = async (amount: number) => {
    if (amount === 0 || selectedPlayers.size === 0) {
      alert('Selecciona jugadores y especifica una cantidad válida');
      return;
    }

    try {
      setSaving(true);

      // Update points for all selected players
      const updatedRankings = rankings.map((player) => {
        if (selectedPlayers.has(player.id)) {
          return { ...player, points: Math.max(0, player.points + amount) };
        }
        return player;
      });

      // Update points in database
      const updates = Array.from(selectedPlayers).map(async (playerId) => {
        const player = updatedRankings.find(r => r.id === playerId);
        if (!player) return;

        return supabase
          .from('rankings')
          .update({ points: player.points })
          .eq('id', playerId);
      });

      await Promise.all(updates);

      // Sort by points and recalculate positions
      const sorted = [...updatedRankings].sort((a, b) => b.points - a.points);
      const withNewPositions = sorted.map((player, index) => ({
        ...player,
        position: index + 1
      }));

      // Update positions in database
      for (const player of withNewPositions) {
        await supabase
          .from('rankings')
          .update({ position: player.position })
          .eq('id', player.id);
      }

      // Update local state
      setRankings(withNewPositions);
      setSelectedPlayers(new Set());
      setMassAdjustment('');
      alert(`Puntos ajustados para ${Array.from(selectedPlayers).length} jugadores`);
    } catch (error) {
      console.error('Error in mass adjustment:', error);
      alert('Error al ajustar puntos masivamente');
    } finally {
      setSaving(false);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    const newSelection = new Set(selectedPlayers);
    if (newSelection.has(playerId)) {
      newSelection.delete(playerId);
    } else {
      newSelection.add(playerId);
    }
    setSelectedPlayers(newSelection);
  };

  const selectAllPlayers = () => {
    if (selectedPlayers.size === filteredRankings.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(filteredRankings.map(r => r.id)));
    }
  };

  const deletePlayer = async (id: string) => {
    if (!confirm('¿Está seguro que desea eliminar este jugador?')) return;

    try {
      const { error } = await supabase
        .from('rankings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRankings(rankings.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error al eliminar jugador:', error);
      alert('Error al eliminar jugador. Revise la consola para más detalles.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando...</div>;
  }

  const allMenuItems = [
    { id: 'overview' as TabType, label: 'Resumen', icon: LayoutDashboard },
    { id: 'rankings' as TabType, label: 'Rankings', icon: Users },
    { id: 'history' as TabType, label: 'Historial Rankings', icon: Archive },
    { id: 'historical' as TabType, label: 'Jugadores Históricos', icon: UserCheck },
    { id: 'giro' as TabType, label: 'Jugadores Giro Ganador', icon: Users },
    { id: 'audit' as TabType, label: 'Fiscalizar Torneo', icon: ClipboardCheck },
    { id: 'prizes' as TabType, label: 'Premios', icon: Trophy },
    { id: 'games' as TabType, label: 'Juegos y Puntos', icon: Gamepad2 },
    { id: 'winner' as TabType, label: 'Ganador del Mes', icon: Trophy },
    { id: 'exchange' as TabType, label: 'Tipo de Cambio', icon: DollarSign },
    { id: 'footer' as TabType, label: 'Footer', icon: FileText },
    { id: 'content' as TabType, label: 'Contenido', icon: Video },
    { id: 'manufacturers' as TabType, label: 'Landing Fabricantes', icon: Factory },
    { id: 'clients' as TabType, label: 'Clientes Potenciales', icon: UserPlus },
    { id: 'bot' as TabType, label: 'Envíos del Bot', icon: RefreshCw },
    { id: 'tareas' as TabType, label: 'Tareas', icon: CheckSquare },
    { id: 'lupa' as TabType, label: 'RSS La Lupa de Tobi', icon: Rss },
    { id: 'lupa_log' as TabType, label: 'Log de Importacion', icon: List },
    { id: 'gastos' as TabType, label: 'Gastos', icon: Wallet, superAdminOnly: true },
    { id: 'sueldos' as TabType, label: 'Sueldos', icon: Banknote, superAdminOnly: true },
    { id: 'servicios_usd' as TabType, label: 'Servicios USD', icon: DollarSign, superAdminOnly: true },
    { id: 'users' as TabType, label: 'Gestión de Usuarios', icon: ShieldCheck, superAdminOnly: true },
    { id: 'emailicons' as TabType, label: 'Iconos de Email', icon: Mail, superAdminOnly: true },
    { id: 'emailtest' as TabType, label: 'Test Email', icon: Settings, superAdminOnly: true },
    { id: 'account' as TabType, label: 'Cuenta', icon: Settings },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.superAdminOnly && userRole !== 'super_admin') {
      return false;
    }

    if (userRole === 'super_admin') {
      return true;
    }

    return userPermissions.includes(item.id);
  });

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className={`bg-gray-900 text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-700">
          {sidebarOpen && (
            <div>
              <h2 className="text-xl font-bold">Admin Panel</h2>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isLupa = item.id === 'lupa';
            const lupaHasBadge = isLupa && lupaNotiasCount > 0;
            return (
              <button
                key={item.id}
                onClick={() => changeTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  activeTab === item.id
                    ? 'bg-green-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Icon className="w-5 h-5" />
                  {lupaHasBadge && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {lupaNotiasCount > 99 ? '99+' : lupaNotiasCount}
                    </span>
                  )}
                </div>
                {sidebarOpen && (
                  <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                )}
                {sidebarOpen && lupaHasBadge && (
                  <span className="ml-auto min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                    {lupaNotiasCount > 99 ? '99+' : lupaNotiasCount}
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-600 hover:bg-red-700 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Cerrar Sesión</span>}
          </button>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
            <p className="text-sm text-gray-600">Usuario: <span className="font-semibold">{currentUser}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => changeTab('lupa')}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="RSS La Lupa de Tobi - Noticias"
            >
              <Rss className="w-6 h-6 text-gray-600" />
              {lupaNotiasCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {lupaNotiasCount > 99 ? '99+' : lupaNotiasCount}
                </span>
              )}
            </button>
            <NotificationAlerts
              currentUser={currentUser}
              onNotificationClick={(tareaId) => {
                setOpenTareaId(tareaId);
                changeTab('tareas');
              }}
            />
          </div>
        </div>

        <div className="p-8">
        <div className="max-w-7xl mx-auto">
        <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>}>

        {activeTab === 'overview' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            {userRole === 'editor' ? (
              <EditorDashboard currentUser={currentUser} />
            ) : (
              <DashboardOverview />
            )}
          </div>
        )}

        {activeTab === 'rankings' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex gap-4 mb-6">
              <button
                onClick={openAddPlayerModal}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Agregar Jugador
              </button>
            <button
              onClick={recalculatePositions}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" />
              {saving ? 'Recalculando...' : 'Recalcular Posiciones'}
            </button>
            <button
              onClick={saveAll}
              disabled={saving}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

          <div className="flex gap-4 items-center bg-blue-50 p-4 rounded-lg border-2 border-blue-200 mb-6">
            <div className="font-semibold text-blue-900">
              Ajuste Masivo:
            </div>
            <input
              type="number"
              value={massAdjustment}
              onChange={(e) => setMassAdjustment(e.target.value)}
              placeholder="Cantidad"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => massAdjustPoints(parseInt(massAdjustment))}
              disabled={saving || selectedPlayers.size === 0}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Sumar
            </button>
            <button
              onClick={() => massAdjustPoints(-parseInt(massAdjustment))}
              disabled={saving || selectedPlayers.size === 0}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 rotate-45" />
              Restar
            </button>
            <div className="text-sm text-blue-700">
              {selectedPlayers.size} jugador(es) seleccionado(s)
            </div>
          </div>

          <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-700">Filtrar Jugadores</h3>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="Buscar por nombre, provincia, usuario Bplay, posición o puntos..."
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-100 rounded-r-lg transition-colors"
                  title="Limpiar búsqueda"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            {searchTerm && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <p className="text-sm text-green-700 font-medium">
                    ✓ Mostrando {filteredRankings.length} de {rankings.length} jugadores
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Filtrando por: "{searchTerm}"
                  </p>
                </div>
              </div>
            )}
            {!searchTerm && (
              <p className="text-xs text-gray-500 mt-2">
                💡 Busca por cualquier campo: nombre, provincia, usuario, posición o puntos
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-center p-3 font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedPlayers.size === filteredRankings.length && filteredRankings.length > 0}
                      onChange={selectAllPlayers}
                      className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                    />
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-700">Posición</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Nombre del Jugador</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Provincia</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Usuario Bplay</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Puntos</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Ajustar Puntos</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRankings.map((player) => (
                  <tr key={player.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedPlayers.has(player.id)}
                        onChange={() => togglePlayerSelection(player.id)}
                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={player.position}
                        onChange={(e) => updatePlayer(player.id, 'position', parseInt(e.target.value))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={player.player_name}
                        onChange={(e) => updatePlayer(player.id, 'player_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={player.province || ''}
                        onChange={(e) => updatePlayer(player.id, 'province', e.target.value)}
                        className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Provincia"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={player.usuario_bplay || 'sin definir'}
                        onChange={(e) => updatePlayer(player.id, 'usuario_bplay', e.target.value)}
                        className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Usuario Bplay"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={player.points}
                        onChange={(e) => updatePlayer(player.id, 'points', parseInt(e.target.value))}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={pointsAdjustments[player.id] || ''}
                          onChange={(e) => setPointsAdjustments({ ...pointsAdjustments, [player.id]: e.target.value })}
                          placeholder="±"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => adjustPoints(player.id, parseInt(pointsAdjustments[player.id] || '0'))}
                          disabled={!pointsAdjustments[player.id]}
                          className="bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                        <button
                          onClick={() => adjustPoints(player.id, -parseInt(pointsAdjustments[player.id] || '0'))}
                          disabled={!pointsAdjustments[player.id]}
                          className="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          -
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      {userRole === 'super_admin' && (
                        <button
                          onClick={() => deletePlayer(player.id)}
                          className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      )}
                      {userRole === 'editor' && (
                        <span className="text-sm text-gray-400">Solo lectura</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Consejos:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Haga clic en "Guardar Cambios" para actualizar todos los datos en la base de datos</li>
              <li>• Use "Recalcular Posiciones" para ordenar automáticamente por puntos y actualizar la base de datos</li>
              <li>• Los cambios se verán reflejados inmediatamente en copabplay.com.ar</li>
              <li>• Las posiciones 1-3 se resaltarán con colores especiales en el ranking</li>
            </ul>
          </div>
        </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <RankingHistoryManagement />
          </div>
        )}

        {activeTab === 'historical' && (
          <HistoricalPlayers />
        )}

        {activeTab === 'prizes' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <PrizesManagement />
          </div>
        )}

        {activeTab === 'games' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <GamesPointsManagement />
          </div>
        )}

        {activeTab === 'winner' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <MonthlyWinnerManagement />
          </div>
        )}

        {activeTab === 'exchange' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <ExchangeRateManagement />
          </div>
        )}

        {activeTab === 'footer' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <FooterEditor />
          </div>
        )}

        {activeTab === 'content' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <StreamContentManagement />
          </div>
        )}

        {activeTab === 'manufacturers' && (
          <div className="bg-white rounded-lg shadow-lg">
            <ManufacturerLandingAdmin />
          </div>
        )}

        {activeTab === 'account' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <AccountSettings />
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <TournamentAudit />
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <PotentialClientsManagement />
          </div>
        )}

        {activeTab === 'giro' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <GiroGanadorManagement />
          </div>
        )}

        {activeTab === 'bot' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <BotSubmissionsManagement />
          </div>
        )}

        {activeTab === 'tareas' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <TasksManagement
              openTareaId={openTareaId}
              currentUser={currentUser}
              onCloseTask={() => setOpenTareaId(undefined)}
            />
          </div>
        )}

        {activeTab === 'gastos' && (
          <div className="bg-gray-900 rounded-xl p-6">
            <GastosManagement currentUser={currentUser} />
          </div>
        )}

        {activeTab === 'sueldos' && (
          <div className="bg-gray-900 rounded-xl p-6">
            <SueldosManagement currentUser={currentUser} />
          </div>
        )}

        {activeTab === 'servicios_usd' && (
          <div className="bg-gray-900 rounded-xl p-6">
            <ServiciosUSDManagement currentUser={currentUser} />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <UserManagement currentUser={currentUser} />
          </div>
        )}

        {activeTab === 'emailicons' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <EmailIconsManagement />
          </div>
        )}

        {activeTab === 'emailtest' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <EmailChangeTest />
          </div>
        )}

        {activeTab === 'lupa' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <LupaNoticiasPanel />
          </div>
        )}

        {activeTab === 'lupa_log' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Log de Importacion</h2>
              <p className="text-sm text-gray-500 mt-1">Historial de ejecuciones del bot y fuentes RSS activas</p>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />Cargando...</div>}>
              <LupaImportLog />
            </Suspense>
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Agregar Nuevo Jugador</h2>
                <button
                  onClick={closeAddPlayerModal}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre del Jugador <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPlayer.name}
                    onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Ingrese el nombre"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Provincia <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={newPlayer.province}
                    onChange={(e) => setNewPlayer({ ...newPlayer, province: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                  >
                    <option value="">Seleccione una provincia</option>
                    <option value="Buenos Aires">Buenos Aires</option>
                    <option value="Mendoza">Mendoza</option>
                    <option value="Santa Fé">Santa Fé</option>
                    <option value="Córdoba">Córdoba</option>
                    <option value="CABA">CABA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Usuario Bplay <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPlayer.usuario_bplay}
                    onChange={(e) => setNewPlayer({ ...newPlayer, usuario_bplay: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Ingrese el usuario de Bplay"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Puntos <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    value={newPlayer.points}
                    onChange={(e) => setNewPlayer({ ...newPlayer, points: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Ingrese los puntos"
                    min="0"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    La posición se calculará automáticamente según los puntos ingresados.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeAddPlayerModal}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={addPlayer}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  Agregar Jugador
                </button>
              </div>
            </div>
          </div>
        )}
        </Suspense>
        </div>
        </div>
      </main>
    </div>
  );
}
