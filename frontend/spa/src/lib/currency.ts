import type { Organization } from '@hopps/api-client';

/**
 * Currencies an organization can keep its books in. Mirrors app.hopps.organization.domain.Currency in the backend;
 * the organization's currency is what every amount in hopps is displayed in.
 */
export const SUPPORTED_CURRENCIES = ['EUR', 'CHF'] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = 'EUR';

const SYMBOLS: Record<CurrencyCode, string> = {
    EUR: '€',
    CHF: 'CHF',
};

export function isSupportedCurrency(value: unknown): value is CurrencyCode {
    return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** The organization's currency, falling back to euro while no organization is loaded or the value is unknown. */
export function organizationCurrency(organization: Pick<Organization, 'currency'> | null | undefined): CurrencyCode {
    const value = organization?.currency;
    return isSupportedCurrency(value) ? value : DEFAULT_CURRENCY;
}

/** Short symbol for labels and input adornments: "€" for euro, the ISO code for currencies without a common sign. */
export function currencySymbol(currency: string): string {
    return isSupportedCurrency(currency) ? SYMBOLS[currency] : currency;
}

export type FormatCurrencyOptions = {
    /** Overrides the currency, e.g. for a bank account that is kept in another currency than the organization. */
    currency?: string;
    /** Whole amounts, e.g. for compact tree cards. Defaults to the currency's usual two decimals. */
    fractionDigits?: number;
};

/**
 * Locale-aware money formatting: "1.234,56 €" (de) / "€1,234.56" (en) / "CHF 1'234.56" (de-CH). A missing amount
 * renders as an em dash, so callers that want "0,00" must pass zero explicitly.
 */
export function formatCurrency(value: number | null | undefined, currency: string, locale: string, options: FormatCurrencyOptions = {}): string {
    if (value == null || Number.isNaN(value)) return '—';
    const resolvedCurrency = options.currency && options.currency.trim() ? options.currency : currency;
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: resolvedCurrency,
        ...(options.fractionDigits != null ? { minimumFractionDigits: options.fractionDigits, maximumFractionDigits: options.fractionDigits } : {}),
    }).format(value);
}

/**
 * Space-saving amount with a unit suffix for the tiny tree cards: "1.5M€", "12.3k€", "850€" — or "1.5M CHF" when the
 * symbol is a code rather than a single sign.
 */
export function formatCompactCurrency(value: number, currency: string, locale: string): string {
    const symbol = currencySymbol(currency);
    const suffix = symbol.length > 1 ? ` ${symbol}` : symbol;
    const abs = Math.abs(value);
    if (abs >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M${suffix}`;
    }
    if (abs >= 10_000) {
        return `${(value / 1000).toFixed(1)}k${suffix}`;
    }
    if (abs >= 1_000) {
        return `${(value / 1000).toFixed(2)}k${suffix}`;
    }
    return `${value.toLocaleString(locale, { maximumFractionDigits: 0 })}${suffix}`;
}

/** Countries paying in Swiss francs; organizations there keep their books in CHF. */
const FRANC_COUNTRIES = ['CH', 'LI'];

/** The euro area; organizations there keep their books in EUR. */
const EURO_COUNTRIES = ['AT', 'BE', 'BG', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK'];

/**
 * Countries an organization can be registered in: the euro area plus Switzerland and Liechtenstein. Mirrors
 * app.hopps.organization.domain.Currency in the backend.
 */
export const SUPPORTED_COUNTRIES: readonly string[] = [...EURO_COUNTRIES, ...FRANC_COUNTRIES];

/** CHF for Switzerland and Liechtenstein, EUR for every other country. */
export function currencyForCountry(country: string | null | undefined): CurrencyCode {
    return FRANC_COUNTRIES.includes(country?.trim().toUpperCase() ?? '') ? 'CHF' : 'EUR';
}

/**
 * The currency an account with this IBAN is kept in: CHF for Swiss and Liechtenstein IBANs, EUR for every other (the
 * first two letters are the country). Accounts are kept in the organization's currency, so an IBAN whose currency
 * differs cannot be added yet (no conversion). Mirrors app.hopps.bankimport.service.IbanCurrencies in the backend.
 */
export function currencyForIban(iban: string | null | undefined): CurrencyCode {
    return currencyForCountry(iban?.replace(/\s+/g, '').slice(0, 2));
}
