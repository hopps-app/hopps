import { describe, expect, it } from 'vitest';

import { currentYearToDate, monthKeysInRange, resolvePeriod, sameRangeLastYear } from '../periods';

const TODAY = new Date(2026, 4, 20); // 20 May 2026

describe('resolvePeriod', () => {
    it('runs from 1 January to today for the current year', () => {
        expect(resolvePeriod('ytd', TODAY)).toEqual({ startDate: '2026-01-01', endDate: '2026-05-20' });
    });

    it('starts at the beginning of the running quarter', () => {
        expect(resolvePeriod('quarter', TODAY)).toEqual({ startDate: '2026-04-01', endDate: '2026-05-20' });
    });

    it('covers six whole months including the current one', () => {
        expect(resolvePeriod('last6Months', TODAY)).toEqual({ startDate: '2025-12-01', endDate: '2026-05-20' });
    });

    it('crosses the year boundary for the last twelve months', () => {
        expect(resolvePeriod('last12Months', TODAY)).toEqual({ startDate: '2025-06-01', endDate: '2026-05-20' });
    });

    it('covers the complete previous year', () => {
        expect(resolvePeriod('previousYear', TODAY)).toEqual({ startDate: '2025-01-01', endDate: '2025-12-31' });
    });
});

describe('year-on-year comparison window', () => {
    it('compares against the same part of the previous year, not the whole of it', () => {
        expect(currentYearToDate(TODAY)).toEqual({ startDate: '2026-01-01', endDate: '2026-05-20' });
        expect(sameRangeLastYear(TODAY)).toEqual({ startDate: '2025-01-01', endDate: '2025-05-20' });
    });
});

describe('monthKeysInRange', () => {
    it('lists every month of the range, including empty ones', () => {
        expect(monthKeysInRange({ startDate: '2026-01-01', endDate: '2026-03-15' })).toEqual(['2026-01', '2026-02', '2026-03']);
    });

    it('keeps two Januaries apart when the range crosses a year boundary', () => {
        const keys = monthKeysInRange(resolvePeriod('last12Months', TODAY));
        expect(keys).toHaveLength(12);
        expect(keys[0]).toBe('2025-06');
        expect(keys[keys.length - 1]).toBe('2026-05');
        expect(new Set(keys).size).toBe(12);
    });
});
