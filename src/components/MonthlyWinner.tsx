import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Language } from '../hooks/useLanguage';

interface MonthlyWinnerProps {
  language: Language;
  title: string;
}

interface MonthlyWinnerContent {
  image_url: string;
}

export default function MonthlyWinner({ language, title }: MonthlyWinnerProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchMonthlyWinner = async (lang?: Language) => {
    try {
      const targetLang = lang || language;
      const { data, error } = await supabase
        .from('monthly_winner_content')
        .select('image_url')
        .eq('language', targetLang)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setImageUrl(data.image_url);
      } else {
        const { data: fallbackData } = await supabase
          .from('monthly_winner_content')
          .select('image_url')
          .eq('language', 'es')
          .maybeSingle();

        if (fallbackData) {
          setImageUrl(fallbackData.image_url);
        }
      }
    } catch (error) {
      console.error('Error fetching monthly winner:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyWinner();

    const winnerChannel = supabase
      .channel('monthly-winner-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_winner_content' }, () => {
        fetchMonthlyWinner();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(winnerChannel);
    };
  }, []);

  useEffect(() => {
    fetchMonthlyWinner(language);
  }, [language]);

  if (loading) {
    return null;
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="mt-12 bg-gradient-to-br from-black via-gray-900 to-black rounded-3xl p-6 md:p-10 border-4 border-[#FFD700] shadow-2xl shadow-[#FFD700]/30 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
        <div className="absolute top-4 left-4 text-6xl">🏆</div>
        <div className="absolute top-4 right-4 text-6xl">🏆</div>
        <div className="absolute bottom-4 left-8 text-6xl">🎉</div>
        <div className="absolute bottom-4 right-8 text-6xl">🎉</div>
      </div>

      <div className="text-center mb-8 relative z-10">
        <div className="flex items-center justify-center gap-4">
          <Trophy className="w-12 h-12 md:w-16 md:h-16 text-[#00FF87] animate-pulse" />
          <div className="inline-block relative">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00FF87] via-[#00CC6A] to-[#00FF87] tracking-wider transform -skew-y-1 animate-pulse"
                style={{ fontFamily: "'Bungee', sans-serif" }}>
              {title}
            </h2>
            <div className="absolute -inset-2 bg-gradient-to-r from-[#00FF87]/20 to-[#00CC6A]/20 blur-xl -z-10"></div>
          </div>
          <Trophy className="w-12 h-12 md:w-16 md:h-16 text-[#00FF87] animate-pulse" />
        </div>
      </div>

      <div className="relative z-10">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Winner of the Month"
            className="w-full h-auto rounded-2xl border-4 border-[#00FF87] shadow-2xl shadow-[#00FF87]/50"
          />
        ) : (
          <div className="w-full h-64 bg-gradient-to-br from-emerald-700 to-teal-900 rounded-2xl border-4 border-[#00FF87] shadow-2xl shadow-[#00FF87]/50 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-5xl mb-2">🏆</div>
              <p className="text-lg font-bold">Winner of the Month</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
