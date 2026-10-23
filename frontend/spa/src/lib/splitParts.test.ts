import { describe, expect, it } from 'vitest';

import {
    addPart,
    assignedAmount,
    autoName,
    createPart,
    distributeEvenly,
    formatPartAmount,
    parsePartAmount,
    partAmount,
    partErrors,
    removePart,
    restAmount,
    setPartAmount,
    setPartBommel,
    sumState,
    toPartPayloads,
    visibleErrors,
    type SplitGroup,
    type SplitPart,
} from './splitParts';

const TOTAL = 700;

const groupsByBommel: Record<number, SplitGroup[]> = {
    1: [
        { id: 10, name: 'Kostenstelle', required: true },
        { id: 11, name: 'Gemeinnützigkeitsbereich', required: false },
    ],
    2: [{ id: 12, name: 'Projekt', required: true }],
};
const groupsFor = (bommelId: number | null) => (bommelId == null ? [] : (groupsByBommel[bommelId] ?? []));

function twoParts(): SplitPart[] {
    return [
        createPart({ name: 'Bier', bommelId: 1, categoryValues: { 10: 'Getränke' }, rest: true }),
        createPart({ name: 'Pfand', amount: '200,00', bommelId: 1, categoryValues: { 10: 'Material' } }),
    ];
}

describe('amount parsing and formatting', () => {
    it('parses German input with thousands separator and rounds to cents', () => {
        expect(parsePartAmount('1.240,00')).toBe(1240);
        expect(parsePartAmount('12,345')).toBe(12.35);
        expect(parsePartAmount('500')).toBe(500);
    });

    it('treats invalid input as zero', () => {
        expect(parsePartAmount('')).toBe(0);
        expect(parsePartAmount('abc')).toBe(0);
    });

    it('formats with two decimals in German notation', () => {
        expect(formatPartAmount(1240)).toBe('1.240,00');
        expect(formatPartAmount(0)).toBe('0,00');
    });
});

describe('rest part', () => {
    it('derives the rest amount from the total minus the fixed parts', () => {
        const parts = twoParts();
        expect(restAmount(TOTAL, parts)).toBe(500);
        expect(partAmount(parts[0], TOTAL, parts)).toBe(500);
        expect(partAmount(parts[1], TOTAL, parts)).toBe(200);
        expect(assignedAmount(TOTAL, parts)).toBe(700);
    });

    it('turns the rest part into a fixed part once an amount is typed', () => {
        const base = twoParts();
        const updated = setPartAmount(base, base[0].key, '400,00');
        expect(updated[0].rest).toBe(false);
        expect(parsePartAmount(updated[0].amount)).toBe(400);
        // 400 + 200 of 700: the remainder is no longer absorbed by a rest part
        expect(sumState(TOTAL, updated).unassigned).toBe(100);
    });
});

describe('adding and removing parts', () => {
    it('makes a single part the rest part and prefills the new part with the open amount', () => {
        const single = [createPart({ name: 'Alles', amount: '700,00', bommelId: 1 })];
        const parts = addPart(single, TOTAL);
        expect(parts).toHaveLength(2);
        expect(parts[0].rest).toBe(true);
        // nothing was open, so the new part starts at zero and the rest part still carries the full total
        expect(parsePartAmount(parts[1].amount)).toBe(0);
        expect(partAmount(parts[0], TOTAL, parts)).toBe(700);
    });

    it('prefills a new part with the still-open amount when no rest part exists', () => {
        const parts = [createPart({ amount: '500,00', bommelId: 1 }), createPart({ amount: '100,00', bommelId: 1 })];
        const next = addPart(parts, TOTAL);
        expect(parsePartAmount(next[2].amount)).toBe(100);
        expect(next.some((p) => p.rest)).toBe(false);
    });

    it('hands the rest role to the first remaining part and collapses to a single rest part', () => {
        const parts = [createPart({ name: 'A', rest: true }), createPart({ name: 'B', amount: '200,00' }), createPart({ name: 'C', amount: '100,00' })];
        const withoutA = removePart(parts, parts[0].key);
        expect(withoutA.map((p) => p.name)).toEqual(['B', 'C']);
        expect(withoutA[0].rest).toBe(true);
        expect(withoutA[1].rest).toBe(false);

        const single = removePart(withoutA, withoutA[1].key);
        expect(single).toHaveLength(1);
        expect(single[0].rest).toBe(true);
        expect(partAmount(single[0], TOTAL, single)).toBe(700);
    });

    it('distributes evenly with the first part absorbing the rounding remainder', () => {
        const parts = distributeEvenly([createPart(), createPart(), createPart()], 100);
        expect(parts[0].rest).toBe(true);
        expect(parts[1].amount).toBe('33,33');
        expect(parts[2].amount).toBe('33,33');
        expect(partAmount(parts[0], 100, parts)).toBe(33.34);
        expect(assignedAmount(100, parts)).toBe(100);
    });
});

describe('sum state', () => {
    it('reports an exact match', () => {
        const state = sumState(TOTAL, twoParts());
        expect(state.assigned).toBe(700);
        expect(state.diff).toBe(0);
        expect(state.over).toBe(false);
        expect(state.unassigned).toBe(0);
    });

    it('allows an unassigned remainder (a private share) and flags over-distribution', () => {
        const under = [createPart({ amount: '500,00' }), createPart({ amount: '80,00' })];
        expect(sumState(TOTAL, under)).toMatchObject({ assigned: 580, unassigned: 120, over: false });

        const over = [createPart({ amount: '500,00' }), createPart({ amount: '300,00' })];
        expect(sumState(TOTAL, over)).toMatchObject({ assigned: 800, diff: -100, over: true, unassigned: 0 });
    });

    it('ignores rounding noise below half a cent', () => {
        const parts = [createPart({ amount: '0,10' }), createPart({ amount: '0,20' })];
        expect(sumState(0.3, parts).over).toBe(false);
        expect(sumState(0.3, parts).unassigned).toBe(0);
    });
});

describe('bommel change', () => {
    it('drops values of groups that do not apply to the new bommel', () => {
        const part = createPart({ bommelId: 1, categoryValues: { 10: 'Getränke', 11: 'Zweckbetrieb' } });
        const moved = setPartBommel(part, 2, groupsFor);
        expect(moved.bommelId).toBe(2);
        expect(moved.categoryValues).toEqual({});

        const cleared = setPartBommel(part, null, groupsFor);
        expect(cleared.categoryValues).toEqual({});
    });

    it('keeps values of groups the new bommel shares', () => {
        const part = createPart({ bommelId: 1, categoryValues: { 10: 'Getränke' } });
        expect(setPartBommel(part, 1, groupsFor).categoryValues).toEqual({ 10: 'Getränke' });
    });
});

describe('validation', () => {
    it('reports amount, bommel and missing mandatory groups', () => {
        const part = createPart({ bommelId: 1, categoryValues: { 11: 'Zweckbetrieb' } });
        const errors = partErrors(part, 0, groupsFor(1));
        expect(errors).toEqual([{ field: 'amount' }, { field: 'group:10', label: 'Kostenstelle' }]);

        const noBommel = createPart();
        expect(partErrors(noBommel, 50, groupsFor(null))).toEqual([{ field: 'bommel' }]);
    });

    it('is clean for a complete part', () => {
        const part = createPart({ bommelId: 1, categoryValues: { 10: 'Getränke' } });
        expect(partErrors(part, 500, groupsFor(1))).toEqual([]);
    });

    it('shows errors only for touched fields until a submit was attempted', () => {
        const part = createPart({ touched: { bommel: true } });
        const errors = partErrors(part, 0, []);
        expect(visibleErrors(part, errors, false)).toEqual([{ field: 'bommel' }]);
        expect(visibleErrors(part, errors, true)).toEqual([{ field: 'amount' }, { field: 'bommel' }]);
    });
});

describe('naming and payload', () => {
    it('builds the automatic name from bommel and the first group value in display order', () => {
        // Only the second group has a value: it is used. With both set, the first group in display order wins.
        const part = createPart({ bommelId: 1, categoryValues: { 11: 'Zweckbetrieb' } });
        expect(autoName(part, 'Bar', groupsFor(1), 'Teil 1')).toBe('Bar · Zweckbetrieb');
        const both = createPart({ bommelId: 1, categoryValues: { 11: 'Zweckbetrieb', 10: 'Getränke' } });
        expect(autoName(both, 'Bar', groupsFor(1), 'Teil 1')).toBe('Bar · Getränke');
        expect(autoName(createPart({ name: '  Pfand ' }), 'Bar', [], 'Teil 2')).toBe('Pfand');
        expect(autoName(createPart(), null, [], 'Teil 3')).toBe('Teil 3');
    });

    it('turns parts into backend payloads with effective amounts and no empty values', () => {
        const parts = twoParts();
        parts[1].id = 42;
        parts[1].categoryValues = { 10: 'Material', 11: '' };
        const payloads = toPartPayloads(parts, TOTAL, (p, i) => autoName(p, 'Bar', groupsFor(p.bommelId), `Teil ${i + 1}`));
        expect(payloads).toEqual([
            { id: undefined, name: 'Bier', amount: 500, bommelId: 1, categoryValues: { 10: 'Getränke' } },
            { id: 42, name: 'Pfand', amount: 200, bommelId: 1, categoryValues: { 10: 'Material' } },
        ]);
    });
});
