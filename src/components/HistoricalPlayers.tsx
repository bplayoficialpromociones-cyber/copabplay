import { useState, useEffect } from 'react';
import { Users, Search, Edit2, Trash2, X, Save, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { supabase, HistoricalPlayer } from '../lib/supabase';

interface Filters {
  playerName: string;
  usuarioBplay: string;
  province: string;
  firstMonth: string;
  lastMonth: string;
  totalParticipations: string;
}

export default function HistoricalPlayers() {
  const [players, setPlayers] = useState<HistoricalPlayer[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<HistoricalPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<HistoricalPlayer | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filters, setFilters] = useState<Filters>({
    playerName: '',
    usuarioBplay: '',
    province: '',
    firstMonth: '',
    lastMonth: '',
    totalParticipations: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    let filtered = [...players];

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.player_name.toLowerCase().includes(term) ||
          p.usuario_bplay.toLowerCase().includes(term) ||
          p.province.toLowerCase().includes(term)
      );
    }

    if (filters.playerName.trim() !== '') {
      filtered = filtered.filter((p) =>
        p.player_name.toLowerCase().includes(filters.playerName.toLowerCase())
      );
    }

    if (filters.usuarioBplay.trim() !== '') {
      filtered = filtered.filter((p) =>
        p.usuario_bplay.toLowerCase().includes(filters.usuarioBplay.toLowerCase())
      );
    }

    if (filters.province.trim() !== '') {
      filtered = filtered.filter((p) =>
        p.province.toLowerCase().includes(filters.province.toLowerCase())
      );
    }

    if (filters.firstMonth.trim() !== '') {
      filtered = filtered.filter((p) => {
        const fullDate = p.first_participated_month && p.first_participated_year
          ? `${p.first_participated_month} ${p.first_participated_year}`
          : '';
        return fullDate.toLowerCase().includes(filters.firstMonth.toLowerCase());
      });
    }

    if (filters.lastMonth.trim() !== '') {
      filtered = filtered.filter((p) => {
        const fullDate = p.last_participated_month && p.last_participated_year
          ? `${p.last_participated_month} ${p.last_participated_year}`
          : '';
        return fullDate.toLowerCase().includes(filters.lastMonth.toLowerCase());
      });
    }

    if (filters.totalParticipations.trim() !== '') {
      filtered = filtered.filter((p) =>
        p.total_participations.toString().includes(filters.totalParticipations)
      );
    }

    setFilteredPlayers(filtered);
    setCurrentPage(1);
  }, [searchTerm, filters, players]);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('historical_players')
        .select('*')
        .order('player_name', { ascending: true });

      if (error) throw error;
      if (data) {
        setPlayers(data);
        setFilteredPlayers(data);
      }
    } catch (error) {
      console.error('Error fetching historical players:', error);
      setMessage({ type: 'error', text: 'Error al cargar los jugadores históricos' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (player: HistoricalPlayer) => {
    setEditingPlayer({ ...player });
  };

  const handleSaveEdit = async () => {
    if (!editingPlayer) return;

    if (!editingPlayer.player_name.trim() || !editingPlayer.province.trim()) {
      setMessage({ type: 'error', text: 'El nombre y la provincia son obligatorios' });
      return;
    }

    try {
      const { error } = await supabase
        .from('historical_players')
        .update({
          player_name: editingPlayer.player_name.trim(),
          usuario_bplay: editingPlayer.usuario_bplay.trim(),
          province: editingPlayer.province.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPlayer.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Jugador actualizado exitosamente' });
      setEditingPlayer(null);
      await fetchPlayers();
    } catch (error: any) {
      console.error('Error updating player:', error);
      setMessage({ type: 'error', text: error.message || 'Error al actualizar el jugador' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${name} del historial?`)) return;

    try {
      const { error } = await supabase
        .from('historical_players')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Jugador eliminado exitosamente' });
      await fetchPlayers();
    } catch (error: any) {
      console.error('Error deleting player:', error);
      setMessage({ type: 'error', text: error.message || 'Error al eliminar el jugador' });
    }
  };

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      playerName: '',
      usuarioBplay: '',
      province: '',
      firstMonth: '',
      lastMonth: '',
      totalParticipations: ''
    });
    setSearchTerm('');
  };

  const hasActiveFilters =
    filters.playerName !== '' ||
    filters.usuarioBplay !== '' ||
    filters.province !== '' ||
    filters.firstMonth !== '' ||
    filters.lastMonth !== '' ||
    filters.totalParticipations !== '' ||
    searchTerm !== '';

  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPlayers = filteredPlayers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Users size={48} className="text-green-400" />
          <div>
            <h1 className="text-4xl font-black text-green-400" style={{ fontFamily: "'Bungee', sans-serif" }}>
              JUGADORES HISTÓRICOS
            </h1>
            <p className="text-gray-400 mt-2">
              Todos los jugadores que alguna vez participaron en la Copa Bplay
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border-2 ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500 text-green-400'
                : 'bg-red-500/10 border-red-500 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border-4 border-green-500 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Search size={24} className="text-green-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, usuario o provincia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg font-bold transition-colors flex items-center gap-2 ${
                showFilters
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Filter size={20} />
              Filtros
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-3 rounded-lg font-bold bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <X size={20} />
                Limpiar
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mb-4 p-4 bg-gray-700/50 rounded-lg border-2 border-green-500/30">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-green-400 font-bold mb-2 text-sm">
                    Nombre del Jugador
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: C Cabrillana"
                    value={filters.playerName}
                    onChange={(e) => updateFilter('playerName', e.target.value)}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-green-400 font-bold mb-2 text-sm">
                    Usuario Bplay
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 2289481-cabrilcl"
                    value={filters.usuarioBplay}
                    onChange={(e) => updateFilter('usuarioBplay', e.target.value)}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-green-400 font-bold mb-2 text-sm">
                    Provincia
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Buenos Aires"
                    value={filters.province}
                    onChange={(e) => updateFilter('province', e.target.value)}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-green-400 font-bold mb-2 text-sm">
                    Primera Participación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Diciembre 2025"
                    value={filters.firstMonth}
                    onChange={(e) => updateFilter('firstMonth', e.target.value)}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-green-400 font-bold mb-2 text-sm">
                    Última Participación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Diciembre 2025"
                    value={filters.lastMonth}
                    onChange={(e) => updateFilter('lastMonth', e.target.value)}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-green-400 font-bold mb-2 text-sm">
                    Total Participaciones
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 1"
                    value={filters.totalParticipations}
                    onChange={(e) => updateFilter('totalParticipations', e.target.value)}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="text-green-400 font-bold">
            Total de jugadores históricos: {filteredPlayers.length}
            {filteredPlayers.length > itemsPerPage && (
              <span className="ml-4 text-gray-400 font-normal">
                (Mostrando {startIndex + 1}-{Math.min(endIndex, filteredPlayers.length)} de {filteredPlayers.length})
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-green-400 text-xl">Cargando jugadores...</div>
        ) : (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border-4 border-green-500 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-500/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-green-400 font-bold">Nombre del Jugador</th>
                    <th className="px-6 py-4 text-left text-green-400 font-bold">Usuario Bplay</th>
                    <th className="px-6 py-4 text-left text-green-400 font-bold">Provincia</th>
                    <th className="px-6 py-4 text-center text-green-400 font-bold">Primera Participación</th>
                    <th className="px-6 py-4 text-center text-green-400 font-bold">Última Participación</th>
                    <th className="px-6 py-4 text-center text-green-400 font-bold">Total Participaciones</th>
                    <th className="px-6 py-4 text-center text-green-400 font-bold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        No se encontraron jugadores
                      </td>
                    </tr>
                  ) : (
                    currentPlayers.map((player) => (
                      <tr
                        key={player.id}
                        className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                      >
                      <td className="px-6 py-4 text-white font-semibold">{player.player_name}</td>
                      <td className="px-6 py-4 text-gray-300">{player.usuario_bplay}</td>
                      <td className="px-6 py-4 text-gray-300">{player.province}</td>
                      <td className="px-6 py-4 text-center text-gray-300">
                        {player.first_participated_month && player.first_participated_year
                          ? `${player.first_participated_month} ${player.first_participated_year}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-300">
                        {player.last_participated_month && player.last_participated_year
                          ? `${player.last_participated_month} ${player.last_participated_year}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-center text-green-400 font-bold">
                        {player.total_participations}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(player)}
                            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(player.id, player.player_name)}
                            className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredPlayers.length > itemsPerPage && (
              <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-t-2 border-green-500/30">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <ChevronLeft size={20} />
                  Anterior
                </button>

                <div className="flex items-center gap-2">
                  {getPageNumbers().map((page, index) =>
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => goToPage(page as number)}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                          currentPage === page
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Siguiente
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {editingPlayer && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border-4 border-green-500 p-8 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-green-400" style={{ fontFamily: "'Bungee', sans-serif" }}>
                EDITAR JUGADOR
              </h3>
              <button
                onClick={() => setEditingPlayer(null)}
                className="bg-gray-700 text-white p-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-green-400 font-bold mb-2">Nombre del Jugador *</label>
                <input
                  type="text"
                  value={editingPlayer.player_name}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, player_name: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: C Cabrillana"
                />
              </div>

              <div>
                <label className="block text-green-400 font-bold mb-2">Usuario Bplay</label>
                <input
                  type="text"
                  value={editingPlayer.usuario_bplay}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, usuario_bplay: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: 2289481-cabrilcl"
                />
              </div>

              <div>
                <label className="block text-green-400 font-bold mb-2">Provincia *</label>
                <select
                  value={editingPlayer.province}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, province: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Seleccione una provincia</option>
                  <option value="Buenos Aires">Buenos Aires</option>
                  <option value="Caba">Caba</option>
                  <option value="Catamarca">Catamarca</option>
                  <option value="Chaco">Chaco</option>
                  <option value="Chubut">Chubut</option>
                  <option value="Córdoba">Córdoba</option>
                  <option value="Corrientes">Corrientes</option>
                  <option value="Entre Ríos">Entre Ríos</option>
                  <option value="Formosa">Formosa</option>
                  <option value="Jujuy">Jujuy</option>
                  <option value="La Pampa">La Pampa</option>
                  <option value="La Rioja">La Rioja</option>
                  <option value="Mendoza">Mendoza</option>
                  <option value="Misiones">Misiones</option>
                  <option value="Neuquén">Neuquén</option>
                  <option value="Río Negro">Río Negro</option>
                  <option value="Salta">Salta</option>
                  <option value="San Juan">San Juan</option>
                  <option value="San Luis">San Luis</option>
                  <option value="Santa Cruz">Santa Cruz</option>
                  <option value="Santa Fe">Santa Fe</option>
                  <option value="Santiago del Estero">Santiago del Estero</option>
                  <option value="Tierra del Fuego">Tierra del Fuego</option>
                  <option value="Tucumán">Tucumán</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setEditingPlayer(null)}
                className="flex-1 bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-bold flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
