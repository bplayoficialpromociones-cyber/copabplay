import { useState, useEffect } from 'react';

export type Language = 'es' | 'en' | 'pt' | 'fr' | 'de' | 'zh';

const detectBrowserLanguage = (): Language => {
  const browserLang = navigator.language.toLowerCase();

  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('pt')) return 'pt';
  if (browserLang.startsWith('en')) return 'en';
  if (browserLang.startsWith('fr')) return 'fr';
  if (browserLang.startsWith('de')) return 'de';
  if (browserLang.startsWith('zh')) return 'zh';

  return 'es';
};

export const useLanguage = () => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('landing-language');
    return (saved as Language) || detectBrowserLanguage();
  });

  useEffect(() => {
    localStorage.setItem('landing-language', language);
  }, [language]);

  return { language, setLanguage };
};
