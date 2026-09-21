import { describe, expect, it } from 'vitest';

import { currencySymbol, formatCompactCurrency, formatCurrency, isSupportedCurrency, organizationCurrency } from '../currency';

// Intl separates amount and currency symbol with a no-break space; normalise it for the assertions.
const normalise = (value: string) => value.replace(/\s/g, ' ');

describe('organizationCurrency', () => {
    it('falls back to euro while no organization is loaded', () => {
        expect(organizationCurrency(null)).toBe('EUR');
        expect(organizationCurrency(undefined)).toBe('EUR');
    });

    it('returns the organization currency when it is supported', () => {
        expect(organizationCurrency({ currency: 'CHF' })).toBe('CHF');
    });

    it('ignores values the UI does not know how to display', () => {
        expect(organizationCurrency({ currency: 'USD' })).toBe('EUR');
        expect(organizationCurrency({ currency: undefined })).toBe('EUR');
    });
});

describe('isSupportedCurrency', () => {
    it('accepts only the currencies the backend offers', () => {
        expect(isSupportedCurrency('EUR')).toBe(true);
        expect(isSupportedCurrency('CHF')).toBe(true);
        expect(isSupportedCurrency('USD')).toBe(false);
        expect(isSupportedCurrency(null)).toBe(false);
    });
});

describe('currencySymbol', () => {
    it('uses the sign for euro and the code for francs', () => {
        expect(currencySymbol('EUR')).toBe('€');
        expect(currencySymbol('CHF')).toBe('CHF');
    });

    it('passes unknown codes through unchanged', () => {
        expect(currencySymbol('USD')).toBe('USD');
    });
});

describe('formatCurrency', () => {
    it('formats euro in the German style', () => {
        expect(normalise(formatCurrency(12480, 'EUR', 'de'))).toBe('12.480,00 €');
    });

    it('formats francs with the code', () => {
        expect(normalise(formatCurrency(12480, 'CHF', 'de'))).toBe('12.480,00 CHF');
    });

    it('follows the UI language', () => {
        expect(normalise(formatCurrency(12480, 'EUR', 'en'))).toBe('€12,480.00');
    });

    it('renders a missing amount as a dash', () => {
        expect(formatCurrency(undefined, 'EUR', 'de')).toBe('—');
        expect(formatCurrency(null, 'EUR', 'de')).toBe('—');
    });

    it('lets a bank account override the organization currency', () => {
        expect(normalise(formatCurrency(5, 'EUR', 'de', { currency: 'CHF' }))).toBe('5,00 CHF');
        expect(normalise(formatCurrency(5, 'EUR', 'de', { currency: '' }))).toBe('5,00 €');
    });

    it('can drop the decimals', () => {
        expect(normalise(formatCurrency(1234.56, 'EUR', 'de', { fractionDigits: 0 }))).toBe('1.235 €');
    });
});

describe('formatCompactCurrency', () => {
    it('abbreviates thousands and millions', () => {
        expect(formatCompactCurrency(1_500_000, 'EUR', 'de')).toBe('1.5M€');
        expect(formatCompactCurrency(12_345, 'EUR', 'de')).toBe('12.3k€');
        expect(formatCompactCurrency(1_234, 'EUR', 'de')).toBe('1.23k€');
        expect(formatCompactCurrency(850, 'EUR', 'de')).toBe('850€');
    });

    it('separates a multi-letter code from the number', () => {
        expect(formatCompactCurrency(12_345, 'CHF', 'de')).toBe('12.3k CHF');
        expect(formatCompactCurrency(850, 'CHF', 'de')).toBe('850 CHF');
    });
});
