import { useEffect, useState } from 'react';
import { Trophy, Crown, Medal, Flame, Snowflake, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { supabase, RankingPlayer } from '../lib/supabase';
import { useLanguage, Language } from '../hooks/useLanguage';
import { getRankingTranslation } from '../data/rankingTranslations';
import GamesPointsSection from './GamesPointsSection';
import MonthlyWinner from './MonthlyWinner';
import SocialMediaFooter from './SocialMediaFooter';

interface Prize {
  id: string;
  position: number;
  amount: string;
  currency: string;
}

interface FooterContent {
  id: string;
  content: string;
}

export default function December2025Snapshot() {
  const [rankings, setRankings] = useState<RankingPlayer[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [footerContent, setFooterContent] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(0.001);
  const itemsPerPage = 6;
  const { language, setLanguage } = useLanguage();
  const t = getRankingTranslation(language);

  const fetchRankings = async () => {
    try {
      const { data, error } = await supabase
        .from('rankings')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;

      if (data) {
        setRankings(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
    }
  };

  const fetchPrizes = async () => {
    try {
      const { data, error } = await supabase
        .from('prizes_config')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      if (data) {
        setPrizes(data);
      }
    } catch (error) {
      console.error('Error fetching prizes:', error);
    }
  };

  const fetchExchangeRate = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rate_config')
        .select('ars_to_usd')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setExchangeRate(data.ars_to_usd);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
  };

  const fetchFooterContent = async (lang?: Language) => {
    try {
      const targetLang = lang || language;
      const { data, error } = await supabase
        .from('footer_content')
        .select('content')
        .eq('language', targetLang)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setFooterContent(data.content);
      } else {
        const { data: fallbackData } = await supabase
          .from('footer_content')
          .select('content')
          .eq('language', 'es')
          .maybeSingle();

        if (fallbackData) {
          setFooterContent(fallbackData.content);
        }
      }
    } catch (error) {
      console.error('Error fetching footer:', error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchRankings(), fetchPrizes(), fetchFooterContent(), fetchExchangeRate()]);
    setLoading(false);
  };

  const formatPrizeAmount = (amount: string, currency: string) => {
    if (language === 'es') {
      return {
        amount: amount,
        currency: currency
      };
    } else {
      const amountNumber = parseFloat(amount.replace(/[^0-9]/g, ''));
      const usdAmount = Math.round(amountNumber * exchangeRate);
      return {
        amount: `$${usdAmount.toLocaleString('en-US')}`,
        currency: 'USD'
      };
    }
  };

  useEffect(() => {
    loadAllData();

    const interval = setInterval(fetchRankings, 30000);

    const rankingsChannel = supabase
      .channel('rankings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rankings' }, () => {
        fetchRankings();
      })
      .subscribe();

    const prizesChannel = supabase
      .channel('prizes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prizes_config' }, () => {
        fetchPrizes();
      })
      .subscribe();

    const footerChannel = supabase
      .channel('footer-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'footer_content' }, () => {
        fetchFooterContent();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(rankingsChannel);
      supabase.removeChannel(prizesChannel);
      supabase.removeChannel(footerChannel);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showLangMenu && !target.closest('.language-selector')) {
        setShowLangMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLangMenu]);

  useEffect(() => {
    fetchFooterContent(language);
  }, [language]);

  const totalPages = Math.ceil(rankings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRankings = rankings.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const languageOptions: { code: Language; name: string; flag: string }[] = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文', flag: '🇨🇳' }
  ];

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const getPositionIconColor = (position: number) => {
    return 'text-white';
  };

  const getPositionIcon = (position: number) => {
    const iconColor = getPositionIconColor(position);
    switch (position) {
      case 1:
        return <Crown className="w-8 h-8 text-white animate-pulse" />;
      case 2:
        return <Medal className="w-8 h-8 text-white" />;
      case 3:
        return <Medal className="w-8 h-8 text-white" />;
      default:
        return <Trophy className={`w-6 h-6 ${iconColor}`} />;
    }
  };

  const getPositionStyle = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-[#004d2b] via-[#00995a] to-[#00FF87] shadow-2xl shadow-[#00FF87]/50 scale-105 border-4 border-[#00FF87]';
      case 2:
        return 'bg-gradient-to-r from-[#004d2b] via-[#00995a] to-[#00FF87] shadow-xl shadow-[#00FF87]/40 scale-102 border-4 border-[#00FF87]';
      case 3:
        return 'bg-gradient-to-r from-[#004d2b] via-[#00995a] to-[#00FF87] shadow-xl shadow-[#00FF87]/40 scale-102 border-4 border-[#00FF87]';
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
        return 'bg-gradient-to-r from-black to-gray-800 hover:scale-102 transition-transform border-2 border-[#009955]/50';
      default:
        return 'bg-gradient-to-r from-black to-gray-800 hover:scale-102 transition-transform border-2 border-[#009955]/50';
    }
  };

  const getPositionTextColor = (position: number) => {
    return 'text-white';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center gap-6">
          <img src="./imagen_2025-12-23_160207185.png" alt="Copa bplay" className="h-32 animate-pulse border-4 border-[#00FF87] rounded-2xl shadow-2xl shadow-[#00FF87]/50" />
          <div className="text-[#00FF87] text-4xl font-bold animate-pulse" style={{ fontFamily: "'Bungee', sans-serif" }}>
            {t.loading}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pt-8 px-4 pb-0 relative overflow-hidden">
      <div className="fixed top-6 right-6 z-50">
        <div className="relative language-selector">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#00FF87] to-[#00CC6A] text-black px-4 py-2 rounded-full font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-[#00FF87]/50"
          >
            <Globe size={20} />
            <span>{languageOptions.find(opt => opt.code === language)?.flag}</span>
            <span className="hidden sm:inline">{languageOptions.find(opt => opt.code === language)?.name}</span>
          </button>

          {showLangMenu && (
            <div className="absolute top-full right-0 mt-2 bg-gray-900 border-2 border-[#00FF87] rounded-xl shadow-2xl shadow-[#00FF87]/30 overflow-hidden min-w-[200px]">
              {languageOptions.map((option) => (
                <button
                  key={option.code}
                  onClick={() => {
                    setLanguage(option.code);
                    setShowLangMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#00FF87]/20 transition-colors ${
                    language === option.code ? 'bg-[#00FF87]/30 text-[#00FF87]' : 'text-white'
                  }`}
                >
                  <span className="text-xl">{option.flag}</span>
                  <span className="font-semibold">{option.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <Snowflake className="absolute top-[10%] left-[15%] w-6 h-6 text-white/20 animate-pulse" style={{ animationDuration: '3s' }} />
        <Snowflake className="absolute top-[20%] right-[20%] w-8 h-8 text-[#00FF87]/15 animate-pulse" style={{ animationDuration: '4s' }} />
        <Snowflake className="absolute top-[40%] left-[10%] w-5 h-5 text-white/15 animate-pulse" style={{ animationDuration: '3.5s' }} />
        <Snowflake className="absolute top-[60%] right-[15%] w-7 h-7 text-[#00FF87]/10 animate-pulse" style={{ animationDuration: '4.5s' }} />
        <Snowflake className="absolute top-[80%] left-[25%] w-6 h-6 text-white/20 animate-pulse" style={{ animationDuration: '3.2s' }} />
        <Snowflake className="absolute top-[70%] right-[30%] w-5 h-5 text-[#00FF87]/15 animate-pulse" style={{ animationDuration: '4.2s' }} />
        <Flame className="absolute top-[15%] left-[80%] w-6 h-6 text-orange-500/20 animate-pulse" style={{ animationDuration: '2s' }} />
        <Flame className="absolute top-[45%] right-[5%] w-5 h-5 text-red-500/15 animate-pulse" style={{ animationDuration: '2.5s' }} />
        <Flame className="absolute top-[75%] left-[5%] w-7 h-7 text-orange-600/20 animate-pulse" style={{ animationDuration: '2.2s' }} />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8 space-y-6 relative">
          <div className="flex justify-center mb-6 relative">

            <div className="relative christmas-lights-frame">
              <div className="christmas-light light-red" style={{ top: '-8px', left: '10%' }}></div>
              <div className="christmas-light light-gold" style={{ top: '-8px', left: '25%' }}></div>
              <div className="christmas-light light-green" style={{ top: '-8px', left: '40%' }}></div>
              <div className="christmas-light light-blue" style={{ top: '-8px', left: '55%' }}></div>
              <div className="christmas-light light-red" style={{ top: '-8px', left: '70%' }}></div>
              <div className="christmas-light light-gold" style={{ top: '-8px', left: '85%' }}></div>

              <div className="christmas-light light-blue" style={{ bottom: '-8px', left: '10%' }}></div>
              <div className="christmas-light light-green" style={{ bottom: '-8px', left: '25%' }}></div>
              <div className="christmas-light light-gold" style={{ bottom: '-8px', left: '40%' }}></div>
              <div className="christmas-light light-red" style={{ bottom: '-8px', left: '55%' }}></div>
              <div className="christmas-light light-blue" style={{ bottom: '-8px', left: '70%' }}></div>
              <div className="christmas-light light-green" style={{ bottom: '-8px', left: '85%' }}></div>

              <div className="christmas-light light-gold" style={{ top: '15%', left: '-8px' }}></div>
              <div className="christmas-light light-red" style={{ top: '35%', left: '-8px' }}></div>
              <div className="christmas-light light-blue" style={{ top: '55%', left: '-8px' }}></div>
              <div className="christmas-light light-green" style={{ top: '75%', left: '-8px' }}></div>

              <div className="christmas-light light-green" style={{ top: '15%', right: '-8px' }}></div>
              <div className="christmas-light light-blue" style={{ top: '35%', right: '-8px' }}></div>
              <div className="christmas-light light-red" style={{ top: '55%', right: '-8px' }}></div>
              <div className="christmas-light light-gold" style={{ top: '75%', right: '-8px' }}></div>

              <img
                src="./imagen_2025-12-23_160207185.png"
                alt="Copa bplay HAGAN JUEGO"
                className="h-40 md:h-48 rounded-2xl border-4 border-[#00FF87] shadow-2xl shadow-[#00FF87]/50 transform hover:scale-105 transition-transform relative z-10"
              />
            </div>

            <style>{`
              .christmas-lights-frame {
                position: relative;
                padding: 12px;
              }

              .christmas-light {
                position: absolute;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                z-index: 20;
                animation: christmasLightBlink 1.5s ease-in-out infinite;
              }

              .light-red {
                background: radial-gradient(circle at 30% 30%, #ff4444, #cc0000);
                box-shadow: 0 0 12px #ff4444, 0 0 24px #ff4444, 0 0 36px #ff0000, 0 0 48px #ff0000;
              }

              .light-gold {
                background: radial-gradient(circle at 30% 30%, #ffd700, #ffaa00);
                box-shadow: 0 0 12px #ffd700, 0 0 24px #ffd700, 0 0 36px #ffaa00, 0 0 48px #ffaa00;
                animation-delay: 0.3s;
              }

              .light-green {
                background: radial-gradient(circle at 30% 30%, #00ff87, #00cc6a);
                box-shadow: 0 0 12px #00ff87, 0 0 24px #00ff87, 0 0 36px #00cc6a, 0 0 48px #00cc6a;
                animation-delay: 0.6s;
              }

              .light-blue {
                background: radial-gradient(circle at 30% 30%, #4da6ff, #0066cc);
                box-shadow: 0 0 12px #4da6ff, 0 0 24px #4da6ff, 0 0 36px #0066cc, 0 0 48px #0066cc;
                animation-delay: 0.9s;
              }

              @keyframes christmasLightBlink {
                0%, 100% {
                  opacity: 1;
                  transform: scale(1);
                }
                50% {
                  opacity: 0.2;
                  transform: scale(0.85);
                }
              }

              @media (max-width: 768px) {
                .christmas-light {
                  width: 8px;
                  height: 8px;
                }
              }
            `}</style>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Flame className="w-10 h-10 text-[#00FF87] animate-bounce" />
            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00FF87] via-white to-[#00FF87] tracking-wider transform -skew-y-1"
                style={{ fontFamily: "'Bungee', sans-serif" }}>
              {t.title}
            </h1>
            <Flame className="w-10 h-10 text-[#00FF87] animate-bounce" />
          </div>

          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">🎄</span>
            <h2 className="text-2xl md:text-4xl font-bold text-white tracking-wide"
                style={{ fontFamily: "'Bungee', sans-serif" }}>
              {t.subtitle}
            </h2>
            <span className="text-2xl">🎄</span>
          </div>

          <div className="inline-block bg-gradient-to-r from-[#00FF87] to-[#00CC6A] text-black px-6 py-3 rounded-full shadow-lg shadow-[#00FF87]/50 transform -rotate-1 relative">
            <span className="absolute -top-2 -left-2 text-xl">⭐</span>
            <span className="absolute -top-2 -right-2 text-xl">⭐</span>
            <p className="text-base md:text-xl font-bold" style={{ fontFamily: "'Bungee', sans-serif" }}>
              {t.community}
            </p>
          </div>

          <div className="absolute bottom-0 right-0 w-full flex justify-end gap-8 px-4 pointer-events-none">
            <Snowflake className="w-5 h-5 text-white/40 animate-pulse" style={{ animationDelay: '0.3s' }} />
            <Snowflake className="w-7 h-7 text-[#00FF87]/30 animate-bounce" style={{ animationDelay: '0.7s' }} />
          </div>
        </div>

        <div className="bg-black/50 backdrop-blur-sm rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-[#00FF87]/30 relative">
          <div className="absolute -top-3 left-8 text-2xl">🎅</div>
          <div className="absolute -top-3 right-8 text-2xl">🎁</div>
          <div className="space-y-4">
            {currentRankings.map((player, index) => (
              <div
                key={player.id}
                className={`${getPositionStyle(player.position)} rounded-2xl p-4 md:p-6 transition-all duration-300 transform hover:scale-105`}
              >
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 md:w-20 md:h-20">
                    {getPositionIcon(player.position)}
                  </div>

                  <div className="flex-shrink-0 w-20 md:w-28">
                    <div className={`text-4xl md:text-5xl font-black ${getPositionTextColor(player.position)}`}
                         style={{ fontFamily: "'Bungee', sans-serif" }}>
                      #{player.position}
                    </div>
                  </div>

                  <div className="flex-grow min-w-0">
                    <h3 className={`text-2xl md:text-3xl font-bold ${getPositionTextColor(player.position)} truncate`}
                        style={{ fontFamily: "'Bungee', sans-serif" }}>
                      {player.player_name}
                    </h3>
                    {player.province && (
                      <p className={`text-sm md:text-base ${getPositionTextColor(player.position)} opacity-80 truncate`}>
                        📍 {player.province}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    <div className={`text-right ${getPositionTextColor(player.position)}`}>
                      <div className="text-sm md:text-base font-semibold opacity-90">{t.points}</div>
                      <div className="text-3xl md:text-4xl font-black" style={{ fontFamily: "'Bungee', sans-serif" }}>
                        {player.points.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all transform ${
                    currentPage === 1
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#00FF87] to-[#00CC6A] text-black hover:scale-105 shadow-lg shadow-[#00FF87]/50'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">{t.pagination.previous}</span>
                </button>

                <div className="flex items-center gap-2">
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2 text-white text-xl">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => goToPage(page as number)}
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-xl font-bold transition-all transform ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-[#00FF87] to-[#00CC6A] text-black scale-110 shadow-lg shadow-[#00FF87]/50'
                            : 'bg-gray-800 text-white hover:bg-gray-700 hover:scale-105'
                        }`}
                        style={{ fontFamily: "'Bungee', sans-serif" }}
                      >
                        {page}
                      </button>
                    )
                  ))}
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all transform ${
                    currentPage === totalPages
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#00FF87] to-[#00CC6A] text-black hover:scale-105 shadow-lg shadow-[#00FF87]/50'
                  }`}
                >
                  <span className="hidden sm:inline">{t.pagination.next}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <p className="text-white text-sm md:text-base font-semibold">
                {t.pagination.page} {currentPage} {t.pagination.of} {totalPages} • {t.pagination.showing} {currentRankings.length} {t.pagination.of} {rankings.length} {t.pagination.players}
              </p>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-gray-300 text-sm md:text-base">
              {t.lastUpdate} {lastUpdated.toLocaleString(language === 'es' ? 'es-ES' : language === 'en' ? 'en-US' : language === 'pt' ? 'pt-BR' : language === 'fr' ? 'fr-FR' : language === 'de' ? 'de-DE' : 'zh-CN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </p>
          </div>
        </div>

        <div className="mt-12 bg-gradient-to-br from-black via-gray-900 to-black rounded-3xl p-6 md:p-10 border-4 border-[#FFD700] shadow-2xl shadow-[#FFD700]/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
            <div className="absolute top-4 left-4 text-6xl">💰</div>
            <div className="absolute top-4 right-4 text-6xl">💰</div>
            <div className="absolute bottom-4 left-8 text-6xl">🏆</div>
            <div className="absolute bottom-4 right-8 text-6xl">🏆</div>
          </div>

          <div className="text-center mb-8 relative z-10">
            <div className="inline-block relative">
              <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00FF87] via-[#00CC6A] to-[#00FF87] tracking-wider transform -skew-y-1 animate-pulse"
                  style={{ fontFamily: "'Bungee', sans-serif" }}>
                {t.prizes}
              </h2>
              <div className="absolute -inset-2 bg-gradient-to-r from-[#00FF87]/20 to-[#00CC6A]/20 blur-xl -z-10"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 relative z-10">
            {prizes.map((prize) => {
              const getPositionLabel = (pos: number) => {
                switch (pos) {
                  case 1: return t.position1;
                  case 2: return t.position2;
                  case 3: return t.position3;
                  default: return `${pos}${t.positionN}`;
                }
              };

              const getPositionColors = (pos: number) => {
                switch (pos) {
                  case 1:
                    return {
                      gradient: 'from-yellow-500 via-yellow-400 to-yellow-500',
                      border: 'border-yellow-400',
                      shadow: 'shadow-yellow-400/50'
                    };
                  case 2:
                    return {
                      gradient: 'from-gray-400 via-gray-300 to-gray-400',
                      border: 'border-gray-300',
                      shadow: 'shadow-gray-300/50'
                    };
                  case 3:
                    return {
                      gradient: 'from-orange-600 via-orange-500 to-orange-600',
                      border: 'border-orange-400',
                      shadow: 'shadow-orange-400/50'
                    };
                  default:
                    return {
                      gradient: 'from-green-700 via-green-600 to-green-700',
                      border: 'border-green-500',
                      shadow: 'shadow-green-500/50'
                    };
                }
              };

              const getPositionIcon = (pos: number) => {
                switch (pos) {
                  case 1: return <Crown className="w-16 h-16 text-white drop-shadow-lg animate-bounce" />;
                  case 2: return <Medal className="w-16 h-16 text-white drop-shadow-lg animate-pulse" />;
                  case 3: return <Medal className="w-16 h-16 text-white drop-shadow-lg" />;
                  default: return <Trophy className="w-16 h-16 text-white drop-shadow-lg" />;
                }
              };

              const colors = getPositionColors(prize.position);
              const formattedPrize = formatPrizeAmount(prize.amount, prize.currency);

              return (
                <div
                  key={prize.id}
                  className={`bg-gradient-to-br ${colors.gradient} rounded-2xl p-6 transform hover:scale-105 transition-all shadow-2xl ${colors.shadow} border-4 ${colors.border}`}
                >
                  <div className="text-center">
                    <div className="flex justify-center mb-3">
                      {getPositionIcon(prize.position)}
                    </div>
                    <div className="text-white font-black text-2xl mb-2" style={{ fontFamily: "'Bungee', sans-serif" }}>
                      {getPositionLabel(prize.position)}
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-2">
                      <div className="text-white text-lg font-bold mb-1">{t.prize}</div>
                      <div className="text-white text-4xl md:text-5xl font-black" style={{ fontFamily: "'Bungee', sans-serif" }}>
                        {formattedPrize.amount}
                      </div>
                      <div className="text-white text-sm font-semibold">{formattedPrize.currency}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-gradient-to-r from-[#00FF87]/20 to-[#00CC6A]/20 backdrop-blur-sm rounded-2xl p-6 border-2 border-[#00FF87] relative z-10">
            <div className="flex items-start justify-center md:justify-start gap-4">
              <span className="text-4xl mt-1 flex-shrink-0">⚠️</span>
              <div
                className="text-white text-sm md:text-base font-semibold leading-relaxed"
                dangerouslySetInnerHTML={{ __html: footerContent }}
              />
            </div>
          </div>
        </div>

        <MonthlyWinner
          language={language}
          title={t.monthlyWinner}
        />

        <GamesPointsSection
          language={language}
          translations={t.gamesSection}
        />

        <SocialMediaFooter language={language} />
      </div>
    </div>
  );
}
