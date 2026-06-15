import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import ukAuth from './locales/uk/auth.json';
import ukCommon from './locales/uk/common.json';
import ukConfig from './locales/uk/config.json';
import ukSettings from './locales/uk/settings.json';
import ukToday from './locales/uk/today.json';
import ukTimer from './locales/uk/timer.json';
import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enConfig from './locales/en/config.json';
import enSettings from './locales/en/settings.json';
import enToday from './locales/en/today.json';
import enTimer from './locales/en/timer.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uk: {
        common: ukCommon,
        auth: ukAuth,
        config: ukConfig,
        today: ukToday,
        settings: ukSettings,
        timer: ukTimer,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        config: enConfig,
        today: enToday,
        settings: enSettings,
        timer: enTimer,
      },
    },
    fallbackLng: 'uk',
    supportedLngs: ['uk', 'en'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'lang',
    },
    load: 'languageOnly',
    interpolation: {
      escapeValue: false,
    },
    defaultNS: 'common',
  });

export default i18n;
