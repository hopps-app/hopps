import { describe, expect, it } from 'vitest';

import { getTransactionDisplayStatus } from './transactionStatus';

describe('getTransactionDisplayStatus', () => {
    it('passes CONFIRMED through regardless of coverage', () => {
        expect(getTransactionDisplayStatus({ status: 'CONFIRMED', total: -50, coveredAmount: 0 })).toBe('CONFIRMED');
    });

    it('is a draft while no bank movement is linked', () => {
        expect(getTransactionDisplayStatus({ status: 'DRAFT', total: -50, coveredAmount: 0 })).toBe('DRAFT');
        expect(getTransactionDisplayStatus({ status: 'DRAFT', total: -50 })).toBe('DRAFT');
    });

    it('is partially linked when the movements cover only a part of the amount', () => {
        expect(getTransactionDisplayStatus({ status: 'DRAFT', total: -50, coveredAmount: -20 })).toBe('PARTIAL');
    });

    it('is linked once the movements cover the amount exactly', () => {
        expect(getTransactionDisplayStatus({ status: 'DRAFT', total: -50, coveredAmount: -50 })).toBe('LINKED');
        expect(getTransactionDisplayStatus({ status: 'DRAFT', total: 13.68, coveredAmount: 13.68 })).toBe('LINKED');
    });

    it('does not count an over-coverage or a wrong-direction link as linked', () => {
        expect(getTransactionDisplayStatus({ status: 'DRAFT', total: -50, coveredAmount: -70 })).toBe('PARTIAL');
        expect(getTransactionDisplayStatus({ status: 'DRAFT', total: 50, coveredAmount: -50 })).toBe('PARTIAL');
    });
});
