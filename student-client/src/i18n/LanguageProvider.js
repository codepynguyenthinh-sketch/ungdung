import React, { createContext, useState, useContext, useEffect } from 'react';
import { IntlProvider } from 'react-intl';
import en from '../locales/en.json';
import vi from '../locales/vi.json';

const messages = {
  'en': en,
  'vi': vi
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem('student_library_locale') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('student_library_locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const toggleLanguage = () => {
    setLocale(prevLocale => prevLocale === 'en' ? 'vi' : 'en');
  };

  const changeLanguage = (newLocale) => {
    if (['en', 'vi'].includes(newLocale)) {
      setLocale(newLocale);
    }
  };

  return (
    <LanguageContext.Provider value={{ locale, toggleLanguage, changeLanguage }}>
      <IntlProvider locale={locale} messages={messages[locale]} defaultLocale="en">
        {children}
      </IntlProvider>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
