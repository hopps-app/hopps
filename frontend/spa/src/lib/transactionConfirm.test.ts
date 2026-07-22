import { describe, expect, it } from 'vitest';

import { getTransactionConfirmState, type TransactionConfirmFields } from './transactionConfirm';

// A set of fields that satisfies every non-amount requirement, so tests can focus on the amount/coverage rules.
const completeFields: Omit<TransactionConfirmFields, 'amount'> = {
    date: '2024-01-01',
    counterparty: 'ACME Supplier',
    name: 'Some transaction',
    bommelId: 42,
};

describe('getTransactionConfirmState', () => {
    it('confirms a normal transaction exactly covered by a bank movement', () => {
        const state = getTransactionConfirmState({ ...completeFields, amount: 13.68 }, [{ amount: 13.68 }]);
        expect(state.canConfirm).toBe(true);
        expect(state.missing).toEqual([]);
    });

    it('blocks a normal transaction that is not covered', () => {
        const state = getTransactionConfirmState({ ...completeFields, amount: 13.68 }, [{ amount: 5 }]);
        expect(state.canConfirm).toBe(false);
        expect(state.missing).toContain('coverage');
    });

    it('confirms a zero pass-through backed by two offsetting bank movements', () => {
        // Durchlaufender Posten: +13.68 and -13.68 net to zero.
        const state = getTransactionConfirmState({ ...completeFields, amount: 0 }, [{ amount: 13.68 }, { amount: -13.68 }]);
        expect(state.canConfirm).toBe(true);
        expect(state.missing).toEqual([]);
    });

    it('blocks a zero transaction with a single bank movement', () => {
        const state = getTransactionConfirmState({ ...completeFields, amount: 0 }, [{ amount: 13.68 }]);
        expect(state.canConfirm).toBe(false);
        expect(state.missing).toContain('amount');
    });

    it('blocks a zero transaction whose two movements do not net to zero', () => {
        const state = getTransactionConfirmState({ ...completeFields, amount: 0 }, [{ amount: 13.68 }, { amount: 5 }]);
        expect(state.canConfirm).toBe(false);
        expect(state.missing).toContain('coverage');
    });

    it('blocks an empty transaction with no amount and no movements', () => {
        const state = getTransactionConfirmState({ ...completeFields, amount: null }, []);
        expect(state.canConfirm).toBe(false);
        expect(state.missing).toContain('amount');
    });
});
