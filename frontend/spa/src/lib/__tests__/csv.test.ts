import { describe, expect, it } from 'vitest';

import { csvCell, toCsv } from '../csv';

describe('csvCell', () => {
    it('renders a missing value as an empty cell', () => {
        expect(csvCell(null)).toBe('');
        expect(csvCell(undefined)).toBe('');
    });

    it('quotes separators, quotes and line breaks', () => {
        expect(csvCell('a;b')).toBe('"a;b"');
        expect(csvCell('say "hi"')).toBe('"say ""hi"""');
        expect(csvCell('two\nlines')).toBe('"two\nlines"');
    });

    it.each(['=SUM(A1:A2)', '+49 170', '-rm', '@cmd', '\tx'])('neutralizes the formula %j', (value) => {
        expect(csvCell(value).replace(/^"/, '').startsWith("'")).toBe(true);
    });

    it('keeps negative amounts as numbers', () => {
        expect(csvCell('-12,50')).toBe('-12,50');
        expect(csvCell('-12.50')).toBe('-12.50');
        expect(csvCell(-12.5)).toBe('-12.5');
    });
});

describe('toCsv', () => {
    it('joins cells with semicolons and rows with CRLF', () => {
        expect(
            toCsv([
                ['a', 1],
                ['b', null],
            ])
        ).toBe('a;1\r\nb;');
    });
});
