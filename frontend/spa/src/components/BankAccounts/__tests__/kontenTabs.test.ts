import { describe, expect, it } from 'vitest';

import { ALL_TAB, IMPORTS_TAB, hasAllTab, resolveKontenTab } from '../kontenTabs';

const one = [{ id: 1 }];
const two = [{ id: 1 }, { id: 2 }];

describe('hasAllTab', () => {
    it('needs more than one account', () => {
        expect(hasAllTab([])).toBe(false);
        expect(hasAllTab(one)).toBe(false);
        expect(hasAllTab(two)).toBe(true);
    });
});

describe('resolveKontenTab', () => {
    it('starts on the overview with several accounts', () => {
        expect(resolveKontenTab(null, two)).toBe(ALL_TAB);
    });

    it('starts on the account itself with a single one', () => {
        expect(resolveKontenTab(null, one)).toBe('1');
    });

    it('keeps the selection while it exists', () => {
        expect(resolveKontenTab('2', two)).toBe('2');
        expect(resolveKontenTab(ALL_TAB, two)).toBe(ALL_TAB);
        expect(resolveKontenTab(IMPORTS_TAB, one)).toBe(IMPORTS_TAB);
    });

    it('leaves the overview when only one account is left', () => {
        expect(resolveKontenTab(ALL_TAB, one)).toBe('1');
    });

    it('leaves an account that is gone', () => {
        expect(resolveKontenTab('3', two)).toBe(ALL_TAB);
        expect(resolveKontenTab('2', one)).toBe('1');
    });
});
