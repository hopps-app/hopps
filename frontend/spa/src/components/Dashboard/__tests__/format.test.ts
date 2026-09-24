import { describe, expect, it } from 'vitest';

import { percentageChange } from '../format';

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
