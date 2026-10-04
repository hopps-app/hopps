import { describe, expect, it } from 'vitest';

import { caretAfterChars, formatIban, normalizeIban } from '../iban';

describe('formatIban', () => {
    it('groups a pasted IBAN in fours', () => {
        expect(formatIban('CH9300762011623852957')).toBe('CH93 0076 2011 6238 5295 7');
        expect(formatIban('DE89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00');
    });

    it('re-groups badly spaced input and upper-cases it', () => {
        expect(formatIban(' ch93 00762 011623852957 ')).toBe('CH93 0076 2011 6238 5295 7');
    });

    it('adds no trailing space after a complete group', () => {
        expect(formatIban('CH93')).toBe('CH93');
        expect(formatIban('CH930076')).toBe('CH93 0076');
        expect(formatIban('')).toBe('');
    });
});

describe('normalizeIban', () => {
    it('strips spaces and upper-cases', () => {
        expect(normalizeIban('ch93 0076 2011 6238 5295 7')).toBe('CH9300762011623852957');
    });
});

describe('caretAfterChars', () => {
    it('skips the group spaces', () => {
        const formatted = 'CH93 0076 2011';
        expect(caretAfterChars(formatted, 0)).toBe(0);
        expect(caretAfterChars(formatted, 4)).toBe(4);
        expect(caretAfterChars(formatted, 5)).toBe(6);
        expect(caretAfterChars(formatted, 12)).toBe(14);
        expect(caretAfterChars(formatted, 99)).toBe(14);
    });
});
