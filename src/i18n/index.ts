import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import ukAdmin from './locales/uk/admin.json';
import ukAuth from './locales/uk/auth.json';
import ukCommon from './locales/uk/common.json';
import ukSettings from './locales/uk/settings.json';
import ukWelcome from './locales/uk/welcome.json';
import enAdmin from './locales/en/admin.json';
import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enSettings from './locales/en/settings.json';
import enWelcome from './locales/en/welcome.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uk: {
        common: ukCommon,
        auth: ukAuth,
        welcome: ukWelcome,
        settings: ukSettings,
        admin: ukAdmin,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        welcome: enWelcome,
        settings: enSettings,
        admin: enAdmin,
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
