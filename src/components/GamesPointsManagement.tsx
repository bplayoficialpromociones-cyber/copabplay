import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, MoveUp, MoveDown, Gamepad2, Swords, Users, HelpCircle, Disc, Radio, Spade, Trophy, Coins, CircleDollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GamePoint {
  id: string;
  position: number;
  game_name_es: string;
  game_name_en: string;
  game_name_pt: string;
  game_name_fr: string;
  game_name_de: string;
  game_name_zh: string;
  points: number;
  icon: string;
}

const iconOptions = [
  { value: 'coins', label: 'Coins (Slot)', Icon: Coins },
  { value: 'circle-dollar', label: 'Circle Dollar (Slot)', Icon: CircleDollarSign },
  { value: 'swords', label: 'Swords', Icon: Swords },
  { value: 'gamepad', label: 'Gamepad', Icon: Gamepad2 },
  { value: 'users', label: 'Users', Icon: Users },
  { value: 'help-circle', label: 'Help Circle', Icon: HelpCircle },
  { value: 'disc', label: 'Disc', Icon: Disc },
  { value: 'radio', label: 'Radio', Icon: Radio },
  { value: 'spade', label: 'Spade', Icon: Spade },
  { value: 'trophy', label: 'Trophy', Icon: Trophy },
];

export default function GamesPointsManagement() {
  const [games, setGames] = useState<GamePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games_points')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      if (data) {
        setGames(data);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      showMessage('error', 'Error al cargar los juegos');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddGame = () => {
    const newPosition = games.length > 0 ? Math.max(...games.map(g => g.position)) + 1 : 1;
    const newGame: GamePoint = {
      id: crypto.randomUUID(),
      position: newPosition,
      game_name_es: '',
      game_name_en: '',
      game_name_pt: '',
      game_name_fr: '',
      game_name_de: '',
      game_name_zh: '',
      points: 100,
      icon: 'trophy',
    };
    setGames([...games, newGame]);
  };

  const handleDeleteGame = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este juego?')) return;

    try {
      const { error } = await supabase
        .from('games_points')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGames(games.filter(g => g.id !== id));
      showMessage('success', 'Juego eliminado correctamente');
    } catch (error) {
      console.error('Error deleting game:', error);
      showMessage('error', 'Error al eliminar el juego');
    }
  };

  const handleMoveGame = (index: number, direction: 'up' | 'down') => {
    const newGames = [...games];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newGames.length) return;

    [newGames[index], newGames[targetIndex]] = [newGames[targetIndex], newGames[index]];

    newGames.forEach((game, idx) => {
      game.position = idx + 1;
    });

    setGames(newGames);
  };

  const handleUpdateGame = (id: string, field: keyof GamePoint, value: string | number) => {
    setGames(games.map(game =>
      game.id === id ? { ...game, [field]: value } : game
    ));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const game of games) {
        const { error } = await supabase
          .from('games_points')
          .upsert({
            id: game.id,
            position: game.position,
            game_name_es: game.game_name_es,
            game_name_en: game.game_name_en,
            game_name_pt: game.game_name_pt,
            game_name_fr: game.game_name_fr,
            game_name_de: game.game_name_de,
            game_name_zh: game.game_name_zh,
            points: game.points,
            icon: game.icon,
          });

        if (error) throw error;
      }

      showMessage('success', 'Todos los juegos guardados correctamente');
      await fetchGames();
    } catch (error) {
      console.error('Error saving games:', error);
      showMessage('error', 'Error al guardar los juegos');
    } finally {
      setSaving(false);
    }
  };

  const getIconComponent = (iconValue: string) => {
    const iconOption = iconOptions.find(opt => opt.value === iconValue);
    return iconOption ? iconOption.Icon : Trophy;
  };

  if (loading) {
    return <div className="text-white text-center py-8">Cargando juegos...</div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Gamepad2 className="w-8 h-8 text-[#00FF87]" />
          Gestión de Juegos y Puntos
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handleAddGame}
            className="flex items-center gap-2 bg-[#00FF87] text-black px-4 py-2 rounded-lg font-bold hover:bg-[#00CC6A] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Agregar Juego
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Guardando...' : 'Guardar Todo'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white font-semibold`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {games.map((game, index) => {
          const IconComponent = getIconComponent(game.icon);
          return (
            <div key={game.id} className="bg-gray-700 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold text-lg">#{game.position}</span>
                  <IconComponent className="w-6 h-6 text-[#00FF87]" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMoveGame(index, 'up')}
                    disabled={index === 0}
                    className="p-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <MoveUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveGame(index, 'down')}
                    disabled={index === games.length - 1}
                    className="p-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <MoveDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteGame(game.id)}
                    className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-semibold mb-2">Icono</label>
                  <select
                    value={game.icon}
                    onChange={(e) => handleUpdateGame(game.id, 'icon', e.target.value)}
                    className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/50 outline-none"
                  >
                    {iconOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">Puntos</label>
                  <input
                    type="number"
                    value={game.points}
                    onChange={(e) => handleUpdateGame(game.id, 'points', parseInt(e.target.value) || 0)}
                    className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">Nombre (Español)</label>
                  <textarea
                    value={game.game_name_es}
                    onChange={(e) => handleUpdateGame(game.id, 'game_name_es', e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">Nombre (English)</label>
                  <textarea
                    value={game.game_name_en}
                    onChange={(e) => handleUpdateGame(game.id, 'game_name_en', e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">Nombre (Português)</label>
                  <textarea
                    value={game.game_name_pt}
                    onChange={(e) => handleUpdateGame(game.id, 'game_name_pt', e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">Nombre (Français)</label>
                  <textarea
                    value={game.game_name_fr}
                    onChange={(e) => handleUpdateGame(game.id, 'game_name_fr', e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">Nombre (Deutsch)</label>
                  <textarea
                    value={game.game_name_de}
                    onChange={(e) => handleUpdateGame(game.id, 'game_name_de', e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">Nombre (中文)</label>
                  <textarea
                    value={game.game_name_zh}
                    onChange={(e) => handleUpdateGame(game.id, 'game_name_zh', e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/50 outline-none"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {games.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No hay juegos configurados. Haz clic en "Agregar Juego" para comenzar.
        </div>
      )}
    </div>
  );
}
