import countries from 'i18n-iso-countries';
import de from 'i18n-iso-countries/langs/de.json';
import en from 'i18n-iso-countries/langs/en.json';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { SUPPORTED_COUNTRIES } from '@/lib/currency';

countries.registerLocale(de);
countries.registerLocale(en);

/** Shown first, because almost every organization comes from one of them. */
const PREFERRED = ['DE', 'AT', 'CH', 'LI'];

/**
 * The countries an organization can be registered in (euro area plus Switzerland and Liechtenstein), as select options:
 * Germany, Austria, Switzerland and Liechtenstein first, the rest alphabetically.
 */
export function useCountries() {
    const { i18n } = useTranslation();
    const countryOptions = useMemo(() => {
        const lang = i18n.language === 'de' ? 'de' : 'en';
        const option = (code: string) => ({ value: code, label: countries.getName(code, lang, { select: 'official' }) ?? code });
        const rest = SUPPORTED_COUNTRIES.filter((code) => !PREFERRED.includes(code))
            .map(option)
            .sort((a, b) => a.label.localeCompare(b.label, lang));
        return [...PREFERRED.map(option), ...rest];
    }, [i18n.language]);

    return countryOptions;
}
