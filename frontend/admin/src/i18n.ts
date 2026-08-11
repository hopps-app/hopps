import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';

export const LANGUAGE_STORAGE_KEY = 'hopps-admin-language';

const SUPPORTED = ['en', 'de'] as const;
const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
const initialLng = (SUPPORTED as readonly string[]).includes(stored ?? '') ? (stored as string) : 'en';

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        de: { translation: de },
    },
    lng: initialLng,
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false,
    },
});

// Persist the choice so it survives a reload.
i18n.on('languageChanged', (lng) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng.split('-')[0]);
});

export default i18n;
