import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import uk from './locales/uk.json';

i18n.use(initReactI18next).init({
    resources: {
        en: {
            translation: en,
        },
        de: {
            translation: de,
        },
        uk: {
            translation: uk,
        },
        it: {
            translation: it,
        },
        fr: {
            translation: fr,
        },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;
