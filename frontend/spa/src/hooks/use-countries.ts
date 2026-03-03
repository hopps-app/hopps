import countries from 'i18n-iso-countries';
import de from 'i18n-iso-countries/langs/de.json';
import en from 'i18n-iso-countries/langs/en.json';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

countries.registerLocale(de);
countries.registerLocale(en);

export function useCountries() {
    const { i18n } = useTranslation();
    const countryOptions = useMemo(() => {
        const lang = i18n.language === 'de' ? 'de' : 'en';
        const obj = countries.getNames(lang, { select: 'official' });
        return Object.entries(obj)
            .map(([code, name]) => ({
                value: code,
                label: name,
            }))
            .sort((a, b) => a.label.localeCompare(b.label, lang));
    }, [i18n.language]);

    return countryOptions;
}
