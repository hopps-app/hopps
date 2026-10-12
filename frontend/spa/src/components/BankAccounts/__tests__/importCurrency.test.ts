import type { CsvPreviewResponse } from '@hopps/api-client';
import { describe, expect, it } from 'vitest';

import { isCurrencyMismatch, previewCurrencies } from '../importCurrency';

const csvPreview = {
    fileType: 'CSV',
    sampleRows: [
        ['Auftragskonto', 'Buchungstag', 'Betrag', 'Waehrung'],
        ['DE02120300000000202051', '15.07.26', '-163,90', 'EUR'],
        ['DE02120300000000202051', '14.07.26', '540,00', ' eur '],
    ],
} as CsvPreviewResponse;

const sparkasse = { hasHeader: true, skipLines: 0, columnMappings: [{ targetField: 'CURRENCY' as const, sourceColumnIndex: 3 }] };

describe('previewCurrencies', () => {
    it('reads the mapped currency column below the header', () => {
        expect(previewCurrencies(csvPreview, sparkasse)).toEqual(['EUR']);
    });

    it('knows nothing before a schema is chosen or without a currency column', () => {
        expect(previewCurrencies(csvPreview, undefined)).toEqual([]);
        expect(previewCurrencies(csvPreview, { hasHeader: true, columnMappings: [] })).toEqual([]);
        expect(previewCurrencies(null, sparkasse)).toEqual([]);
    });

    it('skips banner lines before the header', () => {
        const withBanner = { ...csvPreview, sampleRows: [['Kontoauszug', 'CHF'], ...csvPreview.sampleRows!] } as CsvPreviewResponse;
        expect(previewCurrencies(withBanner, { ...sparkasse, skipLines: 1 })).toEqual(['EUR']);
    });

    it('reads the currency column of an MT940 preview', () => {
        const mt940 = {
            fileType: 'MT940',
            headerColumns: ['bookingDate', 'amount', 'currency', 'purpose', 'counterpartyName'],
            sampleRows: [['2025-06-02', '59.99', 'CHF', 'Spende', 'Muster']],
        } as CsvPreviewResponse;
        expect(previewCurrencies(mt940, undefined)).toEqual(['CHF']);
    });
});

describe('isCurrencyMismatch', () => {
    it('flags another or several currencies', () => {
        expect(isCurrencyMismatch(['EUR'], 'CHF')).toBe(true);
        expect(isCurrencyMismatch(['CHF', 'EUR'], 'EUR')).toBe(true);
    });

    it('accepts the account currency or an unknown one', () => {
        expect(isCurrencyMismatch(['CHF'], 'CHF')).toBe(false);
        expect(isCurrencyMismatch([], 'CHF')).toBe(false);
        expect(isCurrencyMismatch(['EUR'], undefined)).toBe(false);
    });
});
