import { createContext, useContext, useState, ReactNode } from 'react';
import { fr } from './fr';
import { en } from './en';

export type Language = 'fr' | 'en';
type Translations = typeof fr;

interface TranslationContextType {
  lang: Language;
  t: Translations;
  setLang: (lang: Language) => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Language>('fr');
  const t = lang === 'fr' ? fr : en;

  return (
    <TranslationContext.Provider value={{ lang, t, setLang }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
