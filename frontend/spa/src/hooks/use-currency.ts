import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { currencySymbol, formatCompactCurrency, formatCurrency, organizationCurrency, type CurrencyCode, type FormatCurrencyOptions } from '@/lib/currency';
import { useStore } from '@/store/store';

export type CurrencyFormatter = {
    /** ISO code of the organization's currency, "EUR" until an organization is loaded. */
    currency: CurrencyCode;
    /** "€" or "CHF" — for labels and input adornments. */
    symbol: string;
    /** Full money format in the UI language; a missing amount renders as an em dash. */
    format: (value: number | null | undefined, options?: FormatCurrencyOptions) => string;
    /** Abbreviated amount ("12.3k€") for space-constrained cards. */
    formatCompact: (value: number) => string;
};

/**
 * Formats amounts in the current organization's currency. This is the single place the UI learns which currency to
 * show, so a switch in the organization settings is reflected everywhere at once.
 */
export function useCurrency(): CurrencyFormatter {
    const { i18n } = useTranslation();
    const organization = useStore((state) => state.organization);
    const currency = organizationCurrency(organization);
    const locale = i18n.language;

    return useMemo(
        () => ({
            currency,
            symbol: currencySymbol(currency),
            format: (value, options) => formatCurrency(value, currency, locale, options),
            formatCompact: (value) => formatCompactCurrency(value, currency, locale),
        }),
        [currency, locale]
    );
}
