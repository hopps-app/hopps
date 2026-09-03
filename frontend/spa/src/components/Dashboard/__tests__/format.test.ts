import { describe, expect, it } from 'vitest';

import { formatCurrency, percentageChange } from '../format';

// Intl separates amount and currency symbol with a no-break space; normalise it for the assertions.
const normalise = (value: string) => value.replace(/\s/g, ' ');

describe('formatCurrency', () => {
    it('uses the German currency format', () => {
        expect(normalise(formatCurrency('de', 12480))).toBe('12.480,00 €');
    });

    it('renders a missing value as zero rather than hiding the figure', () => {
        expect(normalise(formatCurrency('de', undefined))).toBe('0,00 €');
    });
});

describe('percentageChange', () => {
    it('reports a rise', () => {
        expect(percentageChange(112, 100)).toEqual({ percent: 12, direction: 'up' });
    });

    it('reports a fall', () => {
        expect(percentageChange(96, 100)).toEqual({ percent: 4, direction: 'down' });
    });

    it('reports no movement', () => {
        expect(percentageChange(100, 100)).toEqual({ percent: 0, direction: 'flat' });
    });

    it('has nothing to compare against when the previous period was empty', () => {
        expect(percentageChange(500, 0)).toBeNull();
    });
});
