import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import deLocale from 'i18n-iso-countries/langs/de.json';

// This file provides a function to get country options based on the selected language.
// It uses the i18n-iso-countries library to fetch country names in the specified language.
const locales: Record<string, any> = {
  en: enLocale,
  de: deLocale,
};

export function getCountryOptions(lang: string = 'en') {
  const locale = locales[lang] || locales['en'];
  countries.registerLocale(locale);

  const names = countries.getNames(lang, { select: 'official' });

  return Object.entries(names).map(([code, name]) => ({
    value: code,
    label: name,
  }));
}
