import { describe, expect, it } from 'vitest';

import { inTreeOrder, parseCategoryGroupFile, PendingCategory, withoutCategory } from '../categoryValues';

const pending = (value: string, parent?: string): PendingCategory => ({ value, parent, bookable: true, hidden: false });

describe('inTreeOrder', () => {
    it('puts children directly after their parent', () => {
        const ordered = inTreeOrder([pending('Beitrag', 'Einnahmen'), pending('Sonstiges'), pending('Einnahmen'), pending('Spende', 'Einnahmen')]);

        expect(ordered.map((c) => c.value)).toEqual(['Sonstiges', 'Einnahmen', 'Beitrag', 'Spende']);
    });

    it('keeps a category whose parent is not in the list', () => {
        expect(inTreeOrder([pending('Beitrag', 'fehlt')]).map((c) => c.value)).toEqual(['Beitrag']);
    });
});

describe('withoutCategory', () => {
    it('moves the children of a removed parent to the top level', () => {
        const rest = withoutCategory([pending('Einnahmen'), pending('Beitrag', 'Einnahmen'), pending('Sonstiges')], 'Einnahmen');

        expect(rest).toEqual([pending('Beitrag'), pending('Sonstiges')]);
    });
});

describe('parseCategoryGroupFile', () => {
    const valid = {
        formatVersion: 1,
        sourceKey: 'abc',
        name: 'Konten',
        required: true,
        values: [{ value: 'A', parent: null, bookable: false, hidden: false }],
    };

    it('reads an export file', () => {
        const file = parseCategoryGroupFile(JSON.stringify(valid));

        expect(file?.name).toBe('Konten');
        expect(file?.sourceKey).toBe('abc');
        expect(file?.values?.[0].bookable).toBe(false);
    });

    it.each([
        ['no JSON', 'keine Datei'],
        ['null', 'null'],
        ['a newer format', JSON.stringify({ ...valid, formatVersion: 2 })],
        ['no name', JSON.stringify({ ...valid, name: ' ' })],
        ['no values', JSON.stringify({ ...valid, values: 'A' })],
    ])('rejects %s', (_label, text) => {
        expect(parseCategoryGroupFile(text)).toBeNull();
    });
});
