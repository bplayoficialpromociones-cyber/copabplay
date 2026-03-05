import React, { useState, useEffect } from 'react';
import { Globe, Check, Users, TrendingUp, Shield, Video, MessageSquare, Calendar, Globe as Globe2, DollarSign } from 'lucide-react';
import { useLanguage, Language } from '../hooks/useLanguage';
import { getTranslation } from '../data/translations';
import { ManufacturerContactForm } from './ManufacturerContactForm';
import { HighlightedText } from './HighlightedText';

type FontOption = 'Permanent Marker' | 'Titan One' | 'Bungee';

export function ManufacturerLanding() {
  const { language, setLanguage } = useLanguage();
  const t = getTranslation(language);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const selectedFont = 'Bungee';

  useEffect(() => {
    document.title = 'Stream HAGAN Juego - Casino Game Manufacturers';
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

  const languageOptions: { code: Language; name: string; flag: string }[] = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文', flag: '🇨🇳' }
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div className="fixed top-6 right-6 z-50">
        <div className="relative language-selector">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-green-500/50"
          >
            <Globe size={20} />
            <span>{languageOptions.find(opt => opt.code === language)?.flag}</span>
            <span className="hidden sm:inline">{languageOptions.find(opt => opt.code === language)?.name}</span>
          </button>

          {showLangMenu && (
            <div className="absolute top-full right-0 mt-2 bg-gray-900 border-2 border-green-500 rounded-xl shadow-2xl shadow-green-500/30 overflow-hidden min-w-[200px]">
              {languageOptions.map((option) => (
                <button
                  key={option.code}
                  onClick={() => {
                    setLanguage(option.code);
                    setShowLangMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-green-500/20 transition-colors ${
                    language === option.code ? 'bg-green-500/30 text-green-400' : 'text-white'
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

      <section className="relative min-h-screen flex items-start justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-10 w-64 h-64 bg-green-500 rounded-full filter blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
          </div>
        </div>

        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFhMWExYSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>


        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center pt-20">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 leading-none">
            <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 bg-clip-text text-transparent drop-shadow-lg" style={{ fontFamily: `'${selectedFont}', sans-serif`, letterSpacing: '2px', textTransform: 'uppercase' }}>
              {t.hero.title}
            </span>
            <br />
            <span className="text-white drop-shadow-2xl" style={{ fontFamily: `'${selectedFont}', sans-serif`, letterSpacing: '2px', textTransform: 'uppercase', textShadow: '4px 4px 0 #10b981, 8px 8px 20px rgba(16, 185, 129, 0.5)' }}>
              {t.hero.titleHighlight}
            </span>
          </h1>

          <div className="max-w-4xl mx-auto mb-8 space-y-4">
            {t.hero.checks.map((check, index) => (
              <div key={index} className="flex items-start gap-4 bg-gradient-to-r from-gray-900/80 to-black/80 border border-green-500/30 rounded-xl p-6">
                <Check size={28} className="text-green-500 flex-shrink-0 mt-1" />
                <p className="text-lg md:text-xl text-gray-200 leading-relaxed font-semibold text-left">{check}</p>
              </div>
            ))}
          </div>

          <a
            href="#contact"
            className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white px-12 py-5 rounded-full text-2xl font-black hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-300 shadow-2xl shadow-green-500/50 mb-6"
            style={{ fontFamily: `'${selectedFont}', sans-serif`, letterSpacing: '2px' }}
          >
            {t.hero.cta}
          </a>
        </div>

        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-8 h-12 border-2 border-green-500 rounded-full flex items-start justify-center p-2">
            <div className="w-2 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </section>

      <section className="relative py-12 bg-black">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-6xl font-black text-center mb-16 text-white" style={{ fontFamily: `'${selectedFont}', sans-serif`, letterSpacing: '2px', textTransform: 'uppercase', textShadow: '3px 3px 0 #10b981' }}>
            {t.plans.title}
          </h2>

          <div className="hidden lg:grid lg:grid-cols-3 gap-8">
            {t.plans.items.map((plan, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-900 to-black border-2 border-green-500 rounded-2xl p-8 hover:border-emerald-400 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-green-500/30 flex flex-col"
              >
                <h3 className="text-xl font-black mb-4 leading-tight" style={{ fontFamily: `'${selectedFont}', sans-serif`, letterSpacing: '1px' }}>
                  <HighlightedText text={plan.name} />
                </h3>

                <p className="text-gray-300 mb-6 leading-relaxed flex-grow">
                  <HighlightedText text={plan.description} />
                </p>

                <div className="space-y-4 border-t border-green-500/30 pt-6">
                  <div className="flex items-start gap-3">
                    <Globe2 size={20} className="text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm text-gray-400 font-semibold">{t.plans.labels.language}</p>
                      <p className="text-white">{plan.languages}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar size={20} className="text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm text-gray-400 font-semibold">{t.plans.labels.duration}</p>
                      <p className="text-white">{plan.duration}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <DollarSign size={20} className="text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm text-gray-400 font-semibold">{t.plans.labels.price}</p>
                      <p className="text-2xl font-black text-white" style={{ fontFamily: `'${selectedFont}', sans-serif`, letterSpacing: '1px' }}>
                        <HighlightedText text={plan.price} />
                      </p>
                    </div>
                  </div>

                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mt-4">
                    <p className="text-sm text-gray-300">
                      <HighlightedText text={plan.note} />
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:hidden">
            <div className="overflow-x-auto pb-8 -mx-6 px-6 scrollbar-hide">
              <div className="flex gap-4" style={{ width: 'fit-content' }}>
                {t.plans.items.map((plan, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-gray-900 to-black border-2 border-green-500 rounded-2xl p-6 flex flex-col"
                    style={{ minWidth: '85vw', maxWidth: '85vw' }}
                  >
                    <h3 className="text-lg font-black mb-4 leading-tight" style={{ fontFamily: `'${selectedFont}', sans-serif`, letterSpacing: '1px' }}>
                      <HighlightedText text={plan.name} />
                    </h3>

                    <p className="text-gray-300 mb-6 leading-relaxed flex-grow text-sm">
                      <HighlightedText text={plan.description} />
                    </p>

                    <div className="space-y-3 border-t border-green-500/30 pt-4">
                      <div className="flex items-start gap-2">
                        <Globe2 size={18} className="text-green-500 flex-shrink-0 mt-1" />
                        <div>
                          <p className="text-xs text-gray-400 font-semibold">{t.plans.labels.language}</p>
                          <p className="text-white text-sm">{plan.languages}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Calendar size={18} className="text-green-500 flex-shrink-0 mt-1" />
                        <div>
                          <p className="text-xs text-gray-400 font-semibold">{t.plans.labels.duration}</p>
                          <p className="text-white text-sm">{plan.duration}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <DollarSign size={18} className="text-green-500 flex-shrink-0 mt-1" />
                        <div>
                          <p className="text-xs text-gray-400 font-semibold">{t.plans.labels.price}</p>
                          <p className="text-xl font-black text-white" style={{ fontFamily: `'${selectedFont}', sans-serif`, letterSpacing: '1px' }}>
                            <HighlightedText text={plan.price} />
                          </p>
                        </div>
                      </div>

                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 mt-3">
                        <p className="text-xs text-gray-300">
                          <HighlightedText text={plan.note} />
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-center text-sm text-green-400 mt-4 animate-pulse">
              {t.plans.scrollHint}
            </p>
          </div>

          <div className="flex justify-center mt-6">
            <a
              href="#contact"
              className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white px-12 py-5 rounded-full text-2xl font-black hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-300 shadow-2xl shadow-green-500/50"
              style={{ fontFamily: `'${selectedFont}', sans-serif`, letterSpacing: '2px' }}
            >
              {t.hero.cta}
            </a>
          </div>
        </div>
      </section>

      <section className="relative py-12 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl md:text-6xl font-black text-center mb-8 text-white" style={{ fontFamily: `'${selectedFont}', sans-serif`, letterSpacing: '2px', textTransform: 'uppercase', textShadow: '3px 3px 0 #10b981' }}>
            {t.why.title}
          </h2>

          <div className="max-w-4xl mx-auto mb-8 bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500/50 rounded-lg p-6">
            <p className="text-xl md:text-2xl font-bold text-red-400 leading-relaxed text-center">
              {t.why.highlight}
            </p>
          </div>

          <p className="text-lg md:text-xl text-center mb-12 text-gray-300 max-w-4xl mx-auto leading-relaxed whitespace-pre-line">
            {t.why.description}
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {t.why.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-4 bg-gradient-to-r from-gray-900 to-black border border-green-500/30 rounded-xl p-6 hover:border-green-500 transition-all"
              >
                <Check size={24} className="text-green-500 flex-shrink-0 mt-1" />
                <p className="text-lg font-semibold text-gray-200">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-12 bg-black">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-8 text-white" style={{ fontFamily: `'${selectedFont}', sans-serif`, letterSpacing: '2px', textTransform: 'uppercase', textShadow: '3px 3px 0 #10b981' }}>
            {t.operators.title}
          </h2>

          <p className="text-lg md:text-xl mb-8 text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {t.operators.description}
          </p>

          <a
            href="#contact"
            className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white px-12 py-5 rounded-full text-2xl font-black hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-300 shadow-2xl shadow-green-500/50"
            style={{ fontFamily: `'${selectedFont}', sans-serif`, letterSpacing: '2px' }}
          >
            {t.operators.cta}
          </a>
        </div>
      </section>

      <section className="relative py-12 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-8 text-white" style={{ fontFamily: `'${selectedFont}', sans-serif`, letterSpacing: '2px', textTransform: 'uppercase', textShadow: '3px 3px 0 #10b981' }}>
            {t.languages.title}
          </h2>

          <p className="text-xl md:text-2xl mb-8 text-gray-300">
            {t.languages.description}
          </p>

          <div className="flex flex-wrap justify-center gap-6">
            {t.languages.langs.map((lang, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-green-500 to-emerald-600 px-8 py-4 rounded-full text-xl font-black shadow-lg shadow-green-500/50"
                style={{ fontFamily: `'${selectedFont}', sans-serif`, letterSpacing: '1px' }}
              >
                {lang}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="relative py-12 bg-black">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl md:text-6xl font-black text-center mb-8 text-white" style={{ fontFamily: `'${selectedFont}', sans-serif`, letterSpacing: '2px', textTransform: 'uppercase', textShadow: '3px 3px 0 #10b981' }}>
            {t.contact.title}
          </h2>

          <p className="text-xl text-center mb-12 text-gray-300">
            {t.contact.subtitle}
          </p>

          <ManufacturerContactForm language={language} />
        </div>
      </section>

      <footer className="relative bg-gradient-to-b from-gray-900 to-black py-8 border-t-2 border-green-500">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:flex-wrap items-center justify-center gap-2 md:gap-3 text-center text-xs md:text-base">
            <span className="text-white font-bold">{t.footer.company}</span>
            <span className="hidden md:inline text-gray-500">-</span>
            <span className="text-gray-400">{t.footer.location}</span>
            <span className="hidden md:inline text-gray-500">-</span>
            <a
              href="https://wa.me/5491157036536"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 transition-colors font-semibold"
            >
              WhatsApp +5491157036536
            </a>
            <span className="hidden md:inline text-gray-500">-</span>
            <div className="flex items-center gap-3">
              <a
                href="https://www.twitch.tv/bplaypromociones"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 transition-colors font-semibold"
              >
                Twitch
              </a>
              <a
                href="https://kick.com/bplaykick777"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 transition-colors font-semibold"
              >
                Kick
              </a>
            </div>
            <span className="hidden md:inline text-gray-500">-</span>
            <span className="text-gray-500">
              © {new Date().getFullYear()} Stream HAGAN Juego. {t.footer.rights}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
