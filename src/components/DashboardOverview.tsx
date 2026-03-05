import { useEffect, useState } from 'react';
import { Trophy, Users, TrendingUp, Award, DollarSign, Gamepad2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Stats {
  totalPlayers: number;
  averagePoints: number;
  topPlayer: { name: string; points: number } | null;
  totalPrizes: number;
  exchangeRate: number;
  totalGames: number;
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats>({
    totalPlayers: 0,
    averagePoints: 0,
    topPlayer: null,
    totalPrizes: 0,
    exchangeRate: 0,
    totalGames: 0,
  });
  const [loading, setLoading] = useState(true);
  const [topThree, setTopThree] = useState<Array<{ name: string; points: number; province: string }>>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: rankings } = await supabase
        .from('rankings')
        .select('*')
        .order('points', { ascending: false });

      const { data: prizes } = await supabase
        .from('prizes_config')
        .select('*');

      const { data: exchangeRate } = await supabase
        .from('exchange_rate_config')
        .select('ars_to_usd')
        .maybeSingle();

      const { data: games } = await supabase
        .from('games_points')
        .select('*');

      if (rankings) {
        const total = rankings.length;
        const avg = total > 0 ? rankings.reduce((sum, p) => sum + p.points, 0) / total : 0;
        const top = rankings.length > 0 ? { name: rankings[0].player_name, points: rankings[0].points } : null;
        const topThreePlayers = rankings.slice(0, 3).map(p => ({
          name: p.player_name,
          points: p.points,
          province: p.province || 'N/A'
        }));

        setTopThree(topThreePlayers);
        setStats(prev => ({
          ...prev,
          totalPlayers: total,
          averagePoints: Math.round(avg),
          topPlayer: top,
        }));
      }

      if (prizes) {
        setStats(prev => ({ ...prev, totalPrizes: prizes.length }));
      }

      if (exchangeRate) {
        setStats(prev => ({ ...prev, exchangeRate: Number(exchangeRate.usd_to_ars) }));
      }

      if (games) {
        setStats(prev => ({ ...prev, totalGames: games.length }));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Cargando datos del dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Panel de Control</h2>
        <p className="text-gray-600">Resumen general</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Jugadores</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPlayers}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Puntos Promedio</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.averagePoints}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Premios</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPrizes}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <Award className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tipo de Cambio</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">${stats.exchangeRate > 0 ? stats.exchangeRate.toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '—'}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Juegos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalGames}</p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <Gamepad2 className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h3 className="text-xl font-bold text-gray-800">Top 3 Ranking</h3>
          </div>
          <div className="space-y-3">
            {topThree.map((player, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  index === 0
                    ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500'
                    : index === 1
                    ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400'
                    : 'bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0
                        ? 'bg-yellow-500 text-white'
                        : index === 1
                        ? 'bg-gray-400 text-white'
                        : 'bg-orange-500 text-white'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{player.name}</p>
                    <p className="text-sm text-gray-600">{player.province}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{player.points}</p>
                  <p className="text-xs text-gray-600">puntos</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-6 h-6 text-green-500" />
            <h3 className="text-xl font-bold text-gray-800">Ganador del Mes</h3>
          </div>
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-600">Ver en sección "Ganador del Mes"</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border-l-4 border-blue-500">
        <h3 className="text-lg font-bold text-gray-800 mb-3">Información del Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4">
            <p className="text-gray-600 mb-1">Última actualización</p>
            <p className="font-semibold text-gray-900">{new Date().toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-gray-600 mb-1">Estado del sistema</p>
            <p className="font-semibold text-green-600">✓ Operativo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
