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

    it('confirms when a split (partially allocated) movement exactly covers the total', () => {
        // A collective transfer of -649.92 is only allocated with 324.96 to this transaction. Together with the two
        // full movements it covers -1790.48 exactly — even though the full amounts would sum to -2115.44 and wrongly
        // block confirmation.
        const state = getTransactionConfirmState({ ...completeFields, amount: -1790.48 }, [
            { amount: -1436.86 },
            { amount: -649.92, allocatedAmount: 324.96 },
            { amount: -28.66 },
        ]);
        expect(state.canConfirm).toBe(true);
        expect(state.missing).toEqual([]);
    });

    it('blocks an income linked to an expense movement of equal magnitude (directional mismatch)', () => {
        // A +125.50 income covered only by a −125.50 expense movement: magnitudes match but the directions are
        // opposite, so the reconciliation shows a 251.00 difference and confirmation must be blocked.
        const state = getTransactionConfirmState({ ...completeFields, amount: 125.5 }, [{ amount: -125.5 }]);
        expect(state.canConfirm).toBe(false);
        expect(state.missing).toContain('coverage');
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
