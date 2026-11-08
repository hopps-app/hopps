import { describe, expect, it } from 'vitest';

import { currentYearPeriod, isValidRange, parsePeriod, periodToRange, yearOptions } from '../period';

const today = new Date('2026-11-01T12:00:00');

describe('periodToRange', () => {
    it('turns a year into its first and last day', () => {
        expect(periodToRange({ kind: 'year', year: 2025 })).toEqual({ startDate: '2025-01-01', endDate: '2025-12-31' });
    });

    it('keeps a free range as it is', () => {
        expect(periodToRange({ kind: 'custom', startDate: '2025-07-01', endDate: '2026-06-30' })).toEqual({
            startDate: '2025-07-01',
            endDate: '2026-06-30',
        });
    });

    it('leaves everything open for all years', () => {
        expect(periodToRange({ kind: 'all' })).toEqual({});
    });
});

describe('isValidRange', () => {
    it('needs both days with the end not before the start', () => {
        expect(isValidRange('2025-01-01', '2025-01-01')).toBe(true);
        expect(isValidRange('2025-02-01', '2025-01-01')).toBe(false);
        expect(isValidRange('', '2025-01-01')).toBe(false);
    });
});

describe('yearOptions', () => {
    it('lists the years from the first transaction to this year, newest first', () => {
        expect(yearOptions(2024, today)).toEqual([2026, 2025, 2024]);
    });

    it('offers this year while nothing is booked yet', () => {
        expect(yearOptions(undefined, today)).toEqual([2026]);
    });

    it('keeps a selected year that is older than the first transaction', () => {
        expect(yearOptions(2025, today, 2023)).toEqual([2026, 2025, 2024, 2023]);
    });
});

describe('parsePeriod', () => {
    it('reads valid stored periods back', () => {
        expect(parsePeriod({ kind: 'all' }, today)).toEqual({ kind: 'all' });
        expect(parsePeriod({ kind: 'year', year: 2024 }, today)).toEqual({ kind: 'year', year: 2024 });
        expect(parsePeriod({ kind: 'custom', startDate: '2025-01-01', endDate: '2025-03-31' }, today)).toEqual({
            kind: 'custom',
            startDate: '2025-01-01',
            endDate: '2025-03-31',
        });
    });

    it('falls back to the current year for anything else', () => {
        expect(parsePeriod(null, today)).toEqual(currentYearPeriod(today));
        expect(parsePeriod({ kind: 'custom', startDate: '2025-05-01', endDate: '2025-01-01' }, today)).toEqual({ kind: 'year', year: 2026 });
        expect(parsePeriod({ kind: 'year', year: 'x' }, today)).toEqual({ kind: 'year', year: 2026 });
    });
});
