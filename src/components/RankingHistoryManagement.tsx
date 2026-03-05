import { useState, useEffect } from 'react';
import { Archive, Trash2, Eye, AlertTriangle, X, Calendar, Users, Trophy } from 'lucide-react';
import { supabase, RankingPlayer } from '../lib/supabase';

interface RankingSnapshot {
  id: string;
  snapshot_date: string;
  month_name: string;
  year: number;
  ranking_data: RankingPlayer[];
  total_players: number;
  created_at: string;
}

export default function RankingHistoryManagement() {
  const [snapshots, setSnapshots] = useState<RankingSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<RankingSnapshot | null>(null);
  const [resetMonth, setResetMonth] = useState('');
  const [resetYear, setResetYear] = useState(new Date().getFullYear());
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSnapshots();

    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthName = previousMonth.toLocaleDateString('es-ES', { month: 'long' });
    const year = previousMonth.getFullYear();

    setResetMonth(monthName.charAt(0).toUpperCase() + monthName.slice(1));
    setResetYear(year);
  }, []);

  const fetchSnapshots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ranking_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false });

      if (error) throw error;
      if (data) {
        setSnapshots(data);
      }
    } catch (error) {
      console.error('Error fetching snapshots:', error);
      setMessage({ type: 'error', text: 'Error al cargar el historial' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetRanking = async () => {
    if (!resetMonth.trim()) {
      setMessage({ type: 'error', text: 'Por favor ingresa el nombre del mes' });
      return;
    }

    try {
      setResetting(true);
      setMessage(null);

      const { data: existingSnapshot, error: checkError } = await supabase
        .from('ranking_snapshots')
        .select('id')
        .eq('month_name', resetMonth.trim())
        .eq('year', resetYear)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingSnapshot) {
        setMessage({
          type: 'error',
          text: `Ya existe un ranking guardado para ${resetMonth} ${resetYear}. No se puede duplicar.`
        });
        setResetting(false);
        return;
      }

      const { data: currentRankings, error: fetchError } = await supabase
        .from('rankings')
        .select('*')
        .order('position', { ascending: true });

      if (fetchError) throw fetchError;

      if (!currentRankings || currentRankings.length === 0) {
        setMessage({ type: 'error', text: 'No hay rankings para guardar' });
        setResetting(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('ranking_snapshots')
        .insert({
          month_name: resetMonth.trim(),
          year: resetYear,
          ranking_data: currentRankings,
          total_players: currentRankings.length
        });

      if (insertError) throw insertError;

      // Reset all points to 0
      const updatePromises = currentRankings.map(player =>
        supabase
          .from('rankings')
          .update({ points: 0 })
          .eq('id', player.id)
      );

      const updateResults = await Promise.all(updatePromises);
      const updateError = updateResults.find(result => result.error);
      if (updateError?.error) throw updateError.error;

      // Shuffle positions randomly
      const shuffled = [...currentRankings].sort(() => Math.random() - 0.5);
      const positionPromises = shuffled.map((player, index) =>
        supabase
          .from('rankings')
          .update({ position: index + 1 })
          .eq('id', player.id)
      );

      const positionResults = await Promise.all(positionPromises);
      const positionError = positionResults.find(result => result.error);
      if (positionError?.error) throw positionError.error;

      setMessage({ type: 'success', text: `Ranking de ${resetMonth} ${resetYear} guardado y reseteado exitosamente` });
      setShowResetModal(false);
      await fetchSnapshots();
    } catch (error) {
      console.error('Error resetting ranking:', error);
      setMessage({ type: 'error', text: 'Error al resetear el ranking' });
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteSnapshot = async (id: string, monthName: string, year: number) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el snapshot de ${monthName} ${year}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ranking_snapshots')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Snapshot eliminado exitosamente' });
      await fetchSnapshots();
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      setMessage({ type: 'error', text: 'Error al eliminar el snapshot' });
    }
  };

  const handleViewSnapshot = (snapshot: RankingSnapshot) => {
    setSelectedSnapshot(snapshot);
    setShowViewModal(true);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl border-4 border-[#00FF87] shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Archive className="w-8 h-8 text-[#00FF87]" />
          <h2 className="text-3xl font-black text-[#00FF87]" style={{ fontFamily: "'Bungee', sans-serif" }}>
            HISTORIAL DE RANKINGS
          </h2>
        </div>
        <p className="text-white">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl border-4 border-[#00FF87] shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Archive className="w-8 h-8 text-[#00FF87]" />
            <h2 className="text-3xl font-black text-[#00FF87]" style={{ fontFamily: "'Bungee', sans-serif" }}>
              HISTORIAL DE RANKINGS
            </h2>
          </div>
          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg"
          >
            <Archive size={20} />
            Guardar y Resetear Ranking
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-500/20 border-2 border-green-500' : 'bg-red-500/20 border-2 border-red-500'}`}>
            <p className={`${message.type === 'success' ? 'text-green-500' : 'text-red-500'} font-semibold`}>
              {message.text}
            </p>
          </div>
        )}

        {snapshots.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No hay rankings guardados aún</p>
            <p className="text-gray-500 text-sm mt-2">Usa el botón "Guardar y Resetear Ranking" para crear el primer snapshot</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#00FF87]/10 border-b-2 border-[#00FF87]">
                  <th className="px-4 py-3 text-left text-[#00FF87] font-bold">Ranking Guardado</th>
                  <th className="px-4 py-3 text-left text-[#00FF87] font-bold">Fecha de Guardado</th>
                  <th className="px-4 py-3 text-center text-[#00FF87] font-bold">Jugadores</th>
                  <th className="px-4 py-3 text-center text-[#00FF87] font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((snapshot) => (
                  <tr key={snapshot.id} className="border-b border-gray-700 hover:bg-[#00FF87]/5 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-[#00FF87]" />
                        <span className="text-white font-semibold text-lg">
                          Ranking {snapshot.month_name} {snapshot.year}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-300">
                      {new Date(snapshot.snapshot_date).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Users className="w-5 h-5 text-[#00FF87]" />
                        <span className="text-white font-semibold">{snapshot.total_players}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewSnapshot(snapshot)}
                          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                          title="Ver ranking"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteSnapshot(snapshot.id, snapshot.month_name, snapshot.year)}
                          className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
                          title="Eliminar snapshot"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border-4 border-yellow-500 p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <h3 className="text-2xl font-black text-yellow-500" style={{ fontFamily: "'Bungee', sans-serif" }}>
                CONFIRMAR RESET
              </h3>
            </div>

            <div className="mb-6">
              <div className="bg-yellow-500/10 border-2 border-yellow-500 rounded-xl p-4 mb-4">
                <p className="text-yellow-400 font-semibold mb-2">⚠️ Esta acción:</p>
                <ul className="text-white text-sm space-y-1 list-disc list-inside">
                  <li>Guardará el ranking actual como <strong>"{resetMonth} {resetYear}"</strong></li>
                  <li>Reseteará todos los puntos a 0</li>
                  <li>Aleatorizará las posiciones de los jugadores</li>
                  <li>Iniciará un nuevo torneo mensual</li>
                </ul>
              </div>

              <div className="bg-[#00FF87]/10 border-2 border-[#00FF87] rounded-xl p-4 mb-4">
                <p className="text-[#00FF87] font-bold text-lg mb-2">Ranking a guardar:</p>
                <p className="text-white text-2xl font-black" style={{ fontFamily: "'Bungee', sans-serif" }}>
                  {resetMonth} {resetYear}
                </p>
              </div>

              <p className="text-red-400 font-semibold text-center">
                ⚠️ Esta acción no se puede deshacer ⚠️
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleResetRanking}
                disabled={resetting}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:from-yellow-600 hover:to-orange-600 transition-all disabled:opacity-50"
              >
                <Archive size={20} />
                {resetting ? 'Procesando...' : 'Confirmar Reset'}
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="flex items-center gap-2 bg-gray-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-600 transition-all disabled:opacity-50"
              >
                <X size={20} />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedSnapshot && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border-4 border-[#00FF87] p-8 max-w-4xl w-full shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-[#00FF87]" />
                <h3 className="text-2xl font-black text-[#00FF87]" style={{ fontFamily: "'Bungee', sans-serif" }}>
                  RANKING {selectedSnapshot.month_name.toUpperCase()} {selectedSnapshot.year}
                </h3>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="bg-gray-700 text-white p-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4 text-gray-400">
              Guardado el: {new Date(selectedSnapshot.snapshot_date).toLocaleString('es-ES')}
            </div>

            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-900">
                  <tr className="bg-[#00FF87]/10 border-b-2 border-[#00FF87]">
                    <th className="px-4 py-3 text-center text-[#00FF87] font-bold">Posición</th>
                    <th className="px-4 py-3 text-left text-[#00FF87] font-bold">Jugador</th>
                    <th className="px-4 py-3 text-left text-[#00FF87] font-bold">Provincia</th>
                    <th className="px-4 py-3 text-left text-[#00FF87] font-bold">Usuario Bplay</th>
                    <th className="px-4 py-3 text-center text-[#00FF87] font-bold">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSnapshot.ranking_data.map((player) => (
                    <tr key={player.id} className="border-b border-gray-700 hover:bg-[#00FF87]/5 transition-colors">
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#00FF87] text-black font-bold">
                          {player.position}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-semibold">{player.player_name}</td>
                      <td className="px-4 py-3 text-gray-300">{player.province || '-'}</td>
                      <td className="px-4 py-3 text-gray-300">{player.usuario_bplay || 'sin definir'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[#00FF87] font-bold text-lg">{player.points}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
