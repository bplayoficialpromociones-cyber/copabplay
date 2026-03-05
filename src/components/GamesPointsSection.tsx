import { useEffect, useState } from 'react';
import { Gamepad2, Swords, Users, HelpCircle, Disc, Radio, Spade, Trophy, Coins, CircleDollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Language } from '../hooks/useLanguage';

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

interface GamesPointsSectionProps {
  language: Language;
  translations: {
    title: string;
    pointsLabel: string;
  };
}

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  'coins': Coins,
  'circle-dollar': CircleDollarSign,
  'swords': Swords,
  'gamepad': Gamepad2,
  'users': Users,
  'help-circle': HelpCircle,
  'disc': Disc,
  'radio': Radio,
  'spade': Spade,
  'trophy': Trophy,
};

export default function GamesPointsSection({ language, translations }: GamesPointsSectionProps) {
  const [games, setGames] = useState<GamePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();

    const channel = supabase
      .channel('games-points-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games_points' }, () => {
        fetchGames();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    } finally {
      setLoading(false);
    }
  };

  const getGameName = (game: GamePoint): string => {
    switch (language) {
      case 'en': return game.game_name_en;
      case 'pt': return game.game_name_pt;
      case 'fr': return game.game_name_fr;
      case 'de': return game.game_name_de;
      case 'zh': return game.game_name_zh;
      default: return game.game_name_es;
    }
  };

  const getIconComponent = (iconValue: string) => {
    return iconMap[iconValue] || Trophy;
  };

  if (loading || games.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-3xl p-6 md:p-10 border-4 border-[#00FF87] shadow-2xl shadow-[#00FF87]/30 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
        <div className="absolute top-4 left-4 text-6xl">🎮</div>
        <div className="absolute top-4 right-4 text-6xl">🎯</div>
        <div className="absolute bottom-4 left-8 text-6xl">⚡</div>
        <div className="absolute bottom-4 right-8 text-6xl">🌟</div>
      </div>

      <div className="text-center mb-8 relative z-10">
        <div className="inline-block relative">
          <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00FF87] via-white to-[#00FF87] tracking-wider transform -skew-y-1"
              style={{ fontFamily: "'Bungee', sans-serif" }}>
            {translations.title}
          </h2>
          <div className="absolute -inset-2 bg-gradient-to-r from-[#00FF87]/20 to-[#00CC6A]/20 blur-xl -z-10"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 relative z-10">
        {games.map((game) => {
          const IconComponent = getIconComponent(game.icon);
          return (
            <div
              key={game.id}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border-2 border-[#00FF87]/50 hover:border-[#00FF87] hover:shadow-lg hover:shadow-[#00FF87]/30 transition-all transform hover:scale-105"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-[#00FF87]/20 rounded-xl p-3">
                  <IconComponent className="w-8 h-8 text-[#00FF87]" />
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="text-white font-bold text-lg mb-2 leading-tight">
                    {getGameName(game)}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-r from-[#00FF87] to-[#00CC6A] text-black px-4 py-2 rounded-full font-black text-lg"
                         style={{ fontFamily: "'Bungee', sans-serif" }}>
                      {game.points} {translations.pointsLabel}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
