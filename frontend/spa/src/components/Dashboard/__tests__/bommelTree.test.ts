import { Bommel } from '@hopps/api-client';
import { describe, expect, it } from 'vitest';

import { collectSubtreeIds, flattenBommelTree } from '../bommelTree';

// The org service returns a flat list in which every bommel carries its parent.
const root = new Bommel({ id: 1, name: 'Verein', emoji: 'tada' });
const sport = new Bommel({ id: 2, name: 'Sport', emoji: 'soccer', parent: root });
const kultur = new Bommel({ id: 3, name: 'Kultur', emoji: 'art', parent: root });
const fussball = new Bommel({ id: 4, name: 'Fussball', emoji: 'ball', parent: sport });
const jugend = new Bommel({ id: 5, name: 'Jugend', emoji: 'child', parent: fussball });

const all = [jugend, root, kultur, fussball, sport];

describe('flattenBommelTree', () => {
    it('returns children under their parent, sorted by name and with the root left out', () => {
        expect(flattenBommelTree(all, root.id)).toEqual([
            { id: 3, name: 'Kultur', emoji: 'art', depth: 0 },
            { id: 2, name: 'Sport', emoji: 'soccer', depth: 0 },
            { id: 4, name: 'Fussball', emoji: 'ball', depth: 1 },
            { id: 5, name: 'Jugend', emoji: 'child', depth: 2 },
        ]);
    });

    it('copes with an empty organization', () => {
        expect(flattenBommelTree([], undefined)).toEqual([]);
    });
});

describe('collectSubtreeIds', () => {
    it('includes the whole subtree so a parent selection covers its children', () => {
        expect(collectSubtreeIds(all, 2).sort()).toEqual([2, 4, 5]);
    });

    it('returns just the leaf when there are no children', () => {
        expect(collectSubtreeIds(all, 5)).toEqual([5]);
    });

    it('falls back to the id itself when the bommel is not in the list', () => {
        expect(collectSubtreeIds(all, 99)).toEqual([99]);
    });
});
