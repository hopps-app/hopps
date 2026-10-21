import { describe, expect, it } from 'vitest';

import de from '../de.json';

// German texts address nobody directly: neither "Sie" nor "du" (see issue #869). Instructions use the infinitive
// ("Bitte alle Pflichtfelder ausfüllen"). Imperatives without a pronoun ("Prüfe …") are not caught here.
const FORMAL = /\b(Sie|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres|Ihnen)\b/;
const INFORMAL = /\b(du|dich|dir|dein\w*)\b/i;

// Texts where "Sie" is the third person (the currency, the receipts), not an address.
const THIRD_PERSON = new Set(['organization.registration.currencyInfo', 'organization.details.currencyHint', 'dashboard.openReceipts.description_other']);

function flatten(node: unknown, path: string[] = []): [string, string][] {
    if (typeof node === 'string') return [[path.join('.'), node]];
    if (node === null || typeof node !== 'object') return [];
    return Object.entries(node).flatMap(([key, value]) => flatten(value, [...path, key]));
}

describe('de.json', () => {
    it('addresses the user neither formally nor informally', () => {
        const offending = flatten(de)
            .filter(([key, text]) => !THIRD_PERSON.has(key) && (FORMAL.test(text) || INFORMAL.test(text)))
            .map(([key, text]) => `${key}: ${text}`);
        expect(offending).toEqual([]);
    });
});
