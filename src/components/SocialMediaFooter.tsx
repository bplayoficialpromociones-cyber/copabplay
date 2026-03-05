import { Instagram, Youtube, Twitch, MessageCircle, MonitorPlay } from 'lucide-react';
import { getRankingTranslation } from '../data/rankingTranslations';
import { Language } from '../hooks/useLanguage';

interface SocialMediaFooterProps {
  language: Language;
}

export default function SocialMediaFooter({ language }: SocialMediaFooterProps) {
  const t = getRankingTranslation(language);

  const renderScheduleInfo = () => {
    const orangeClass = "text-orange-500 font-bold";
    const linkClass = "text-orange-500 font-bold hover:text-orange-400 transition-colors underline";

    switch (language) {
      case 'es':
        return (
          <>
            ESTAMOS EN VIVO <span className={orangeClass}>Martes y Jueves</span> de 15:30 a 17 hrs. CONECTATE AL STREAM en nuestro CANAL de{' '}
            <a href="https://m.twitch.tv/bplaypromociones/home" target="_blank" rel="noopener noreferrer" className={linkClass}>TWITCH</a> o{' '}
            <a href="https://kick.com/bplaykick777" target="_blank" rel="noopener noreferrer" className={linkClass}>KICK</a>. Si no tenes cuenta, no hay problema! ESCRIBINOS y te LA CREAMOS
          </>
        );
      case 'en':
        return (
          <>
            WE ARE LIVE <span className={orangeClass}>Tuesday and Thursday</span> from 3:30 PM to 5 PM. CONNECT TO THE STREAM on our{' '}
            <a href="https://m.twitch.tv/bplaypromociones/home" target="_blank" rel="noopener noreferrer" className={linkClass}>TWITCH</a> or{' '}
            <a href="https://kick.com/bplaykick777" target="_blank" rel="noopener noreferrer" className={linkClass}>KICK</a> CHANNEL. If you don't have an account, no problem! WRITE TO US and we'll CREATE IT FOR YOU
          </>
        );
      case 'pt':
        return (
          <>
            ESTAMOS AO VIVO <span className={orangeClass}>Terça e Quinta</span> das 15:30 às 17 hrs. CONECTE-SE À TRANSMISSÃO em nosso CANAL do{' '}
            <a href="https://m.twitch.tv/bplaypromociones/home" target="_blank" rel="noopener noreferrer" className={linkClass}>TWITCH</a> ou{' '}
            <a href="https://kick.com/bplaykick777" target="_blank" rel="noopener noreferrer" className={linkClass}>KICK</a>. Se você não tem conta, não tem problema! ESCREVA PARA NÓS e nós a CRIAREMOS
          </>
        );
      case 'fr':
        return (
          <>
            NOUS SOMMES EN DIRECT <span className={orangeClass}>Mardi et Jeudi</span> de 15h30 à 17h. CONNECTEZ-VOUS AU STREAM sur notre CHAÎNE{' '}
            <a href="https://m.twitch.tv/bplaypromociones/home" target="_blank" rel="noopener noreferrer" className={linkClass}>TWITCH</a> ou{' '}
            <a href="https://kick.com/bplaykick777" target="_blank" rel="noopener noreferrer" className={linkClass}>KICK</a>. Si vous n'avez pas de compte, pas de problème! ÉCRIVEZ-NOUS et nous le CRÉERONS
          </>
        );
      case 'de':
        return (
          <>
            WIR SIND LIVE <span className={orangeClass}>Dienstag und Donnerstag</span> von 15:30 bis 17 Uhr. VERBINDEN SIE SICH MIT DEM STREAM auf unserem{' '}
            <a href="https://m.twitch.tv/bplaypromociones/home" target="_blank" rel="noopener noreferrer" className={linkClass}>TWITCH</a>- oder{' '}
            <a href="https://kick.com/bplaykick777" target="_blank" rel="noopener noreferrer" className={linkClass}>KICK</a>-KANAL. Wenn Sie kein Konto haben, kein Problem! SCHREIBEN SIE UNS und wir ERSTELLEN ES FÜR SIE
          </>
        );
      case 'zh':
        return (
          <>
            我们直播时间：<span className={orangeClass}>周二和周四</span>下午3:30至5点。在我们的
            <a href="https://m.twitch.tv/bplaypromociones/home" target="_blank" rel="noopener noreferrer" className={linkClass}>TWITCH</a>或
            <a href="https://kick.com/bplaykick777" target="_blank" rel="noopener noreferrer" className={linkClass}>KICK</a>频道上连接到直播。如果您没有账户，没问题！写信给我们，我们会为您创建
          </>
        );
      default:
        return t.socialMedia.scheduleInfo;
    }
  };

  const socialLinks = [
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/comunidad_bplay/',
      icon: Instagram,
      gradient: 'from-purple-600 via-pink-600 to-orange-500',
      hoverGradient: 'hover:from-purple-700 hover:via-pink-700 hover:to-orange-600'
    },
    {
      name: 'YouTube',
      url: 'https://www.youtube.com/@comunidadbplay',
      icon: Youtube,
      gradient: 'from-red-600 to-red-700',
      hoverGradient: 'hover:from-red-700 hover:to-red-800'
    },
    {
      name: 'Twitch',
      url: 'https://m.twitch.tv/bplaypromociones/home',
      icon: Twitch,
      gradient: 'from-purple-600 to-purple-700',
      hoverGradient: 'hover:from-purple-700 hover:to-purple-800'
    },
    {
      name: 'Kick',
      url: 'https://kick.com/bplaykick777',
      icon: MonitorPlay,
      gradient: 'from-green-500 to-green-600',
      hoverGradient: 'hover:from-green-600 hover:to-green-700'
    },
    {
      name: 'WhatsApp',
      url: 'https://wa.me/542262633254',
      icon: MessageCircle,
      gradient: 'from-green-600 to-green-700',
      hoverGradient: 'hover:from-green-700 hover:to-green-800'
    }
  ];

  return (
    <div className="mt-12 bg-gradient-to-br from-black via-gray-900 to-black rounded-3xl p-8 md:p-12 border-4 border-[#00FF87] shadow-2xl shadow-[#00FF87]/30">
      <div className="text-center mb-8">
        <h3 className="text-3xl md:text-4xl font-black text-[#00FF87] mb-2" style={{ fontFamily: "'Bungee', sans-serif" }}>
          {t.socialMedia.title}
        </h3>
        <p className="text-white text-lg mb-4">{t.socialMedia.subtitle}</p>
        <div className="bg-gradient-to-r from-[#00FF87]/20 to-[#00CC6A]/20 backdrop-blur-sm rounded-2xl p-6 border-2 border-[#00FF87] max-w-4xl mx-auto">
          <p className="text-white text-base md:text-lg font-semibold leading-relaxed">
            {renderScheduleInfo()}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
        {socialLinks.map((social) => {
          const Icon = social.icon;
          return (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative bg-gradient-to-br ${social.gradient} ${social.hoverGradient} p-4 md:p-5 rounded-2xl shadow-xl transition-all duration-300 transform hover:scale-110 hover:shadow-2xl`}
              title={social.name}
            >
              <Icon className="w-10 h-10 md:w-12 md:h-12 text-white" strokeWidth={2} />
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-white text-sm font-bold whitespace-nowrap bg-gray-900 px-3 py-1 rounded-lg border-2 border-[#00FF87]">
                  {social.name}
                </span>
              </div>
            </a>
          );
        })}
      </div>

      <div className="mt-12 pt-8 border-t-2 border-[#00FF87]/30 text-center">
        <p className="text-gray-400 text-sm">
          © {new Date().getFullYear()} bplay. {t.socialMedia.copyright}
        </p>
      </div>
    </div>
  );
}
