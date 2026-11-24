import type { TransactionResponse } from '@hopps/api-client';
import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import { transactionsCsv, transactionsExportFileName } from '../exportTransactions';

const t = ((key: string) => key) as unknown as TFunction;

const tx = (fields: Partial<TransactionResponse>) => fields as TransactionResponse;

describe('transactionsCsv', () => {
    it('writes the header and one line per transaction', () => {
        const csv = transactionsCsv(
            [
                tx({
                    transactionTime: new Date('2026-03-15T12:00:00Z'),
                    total: -1234.5,
                    currencyCode: 'CHF',
                    bommelName: 'Jugend',
                    categoryValues: [{ value: 'Material' }, { value: 'Sport' }] as TransactionResponse['categoryValues'],
                    senderName: 'ACME GmbH',
                    name: 'Bälle',
                    status: 'CONFIRMED',
                    documentId: 42,
                }),
            ],
            t,
            'de',
            'EUR'
        );

        const [header, line] = csv.split('\r\n');
        expect(header.split(';')).toEqual([
            'transactions.columns.date',
            'transactions.columns.amount',
            'transactions.export.columns.currency',
            'transactions.columns.bommel',
            'transactions.columns.category',
            'transactions.export.columns.counterparty',
            'transactions.export.columns.description',
            'transactions.columns.status',
            'transactions.export.columns.receipt',
        ]);
        expect(line).toBe('15.03.2026;-1234,50;CHF;Jugend;Material, Sport;ACME GmbH;Bälle;transactions.status.confirmed;42');
    });

    it('leaves missing values empty and falls back to the organization currency', () => {
        const csv = transactionsCsv([tx({ name: 'Entwurf' })], t, 'de', 'EUR');

        expect(csv.split('\r\n')[1]).toBe(';;EUR;;;;Entwurf;transactions.status.draft;');
    });

    it('neutralizes a formula in a counterparty name', () => {
        const csv = transactionsCsv([tx({ senderName: '=HYPERLINK("http://x")' })], t, 'de', 'EUR');

        expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    });
});

describe('transactionsExportFileName', () => {
    it('adds the zero-padded local date', () => {
        expect(transactionsExportFileName('hopps-transaktionen', new Date(2026, 0, 5))).toBe('hopps-transaktionen-2026-01-05.csv');
    });
});
