import { describe, expect, it } from 'vitest';

import { buildReceiptBatches, receiptGroupKey } from '@/lib/pleoReceipts';

const file = (name: string, size = 100) => ({ name, size });

describe('receiptGroupKey', () => {
    it('reads the receipt number from the file name', () => {
        expect(receiptGroupKey('2600016.pdf')).toBe('2600016');
        expect(receiptGroupKey('2600009a.pdf')).toBe('2600009');
        expect(receiptGroupKey('2600009B.PDF')).toBe('2600009');
        expect(receiptGroupKey('2600009_2.jpg')).toBe('2600009');
    });

    it('does not take a trailing digit for a counter', () => {
        expect(receiptGroupKey('2600024.jpg')).toBe('2600024');
    });
});

describe('buildReceiptBatches', () => {
    it('keeps the files of one expense together', () => {
        const batches = buildReceiptBatches([file('2600009a.pdf', 60), file('2600010.pdf', 60), file('2600009b.pdf', 60)], 150);

        expect(batches.map((b) => b.map((f) => f.name))).toEqual([['2600009a.pdf', '2600009b.pdf'], ['2600010.pdf']]);
    });

    it('sends each ZIP on its own', () => {
        const batches = buildReceiptBatches([file('april.zip', 10), file('2600010.pdf', 10), file('mai.zip', 10)], 1000);

        expect(batches.map((b) => b.map((f) => f.name))).toEqual([['april.zip'], ['mai.zip'], ['2600010.pdf']]);
    });

    it('fills a request up to the limit', () => {
        const batches = buildReceiptBatches([file('1.pdf', 40), file('2.pdf', 40), file('3.pdf', 40)], 100);

        expect(batches.map((b) => b.length)).toEqual([2, 1]);
    });

    it('gives a group above the limit a request of its own', () => {
        const batches = buildReceiptBatches([file('1.pdf', 10), file('2a.pdf', 80), file('2b.pdf', 80)], 100);

        expect(batches.map((b) => b.map((f) => f.name))).toEqual([['1.pdf'], ['2a.pdf', '2b.pdf']]);
    });
});
