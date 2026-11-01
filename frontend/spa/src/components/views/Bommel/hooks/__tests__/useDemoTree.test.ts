import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDemoTree } from '../useDemoTree';

const FUSSBALL = -2;
const HANDBALL = -3;
const ROOT = -1;

describe('useDemoTree', () => {
    it('shows only what is booked on a bommel while sub-bommel are not included', () => {
        const { result } = renderHook(() => useDemoTree(false));
        const fussball = result.current.tree.find((node) => node.id === FUSSBALL);
        expect(fussball?.data?.income).toBe(1500);
    });

    it('adds up everything below a bommel when sub-bommel are included', () => {
        const { result } = renderHook(() => useDemoTree(true));
        const fussball = result.current.tree.find((node) => node.id === FUSSBALL);
        // Fußball 1500 + 1. Liga 3000 + 2. Liga 3500 + Fanartikel 2000
        expect(fussball?.data?.income).toBe(10000);
        const root = result.current.tree.find((node) => node.id === ROOT);
        // The root includes the whole structure: all eleven bommels
        expect(root?.data?.income).toBe(22300);
    });

    it('moves a bommel in memory and the sums follow', async () => {
        const { result } = renderHook(() => useDemoTree(true));
        const handballBefore = result.current.tree.find((node) => node.id === HANDBALL)?.data?.income ?? 0;
        const liga2 = result.current.tree.find((node) => node.id === -6)!;

        await act(async () => {
            await result.current.moveTreeNode({ ...liga2, parent: HANDBALL });
        });

        const handballAfter = result.current.tree.find((node) => node.id === HANDBALL)?.data?.income ?? 0;
        expect(handballAfter).toBe(handballBefore + 3500);
    });

    it('does not move a bommel below itself and can be reset', async () => {
        const { result } = renderHook(() => useDemoTree(false));
        const fussball = result.current.tree.find((node) => node.id === FUSSBALL)!;

        await act(async () => {
            await result.current.moveTreeNode({ ...fussball, parent: -5 });
        });
        expect(result.current.tree.find((node) => node.id === FUSSBALL)?.parent).toBe(0);

        const liga2 = result.current.tree.find((node) => node.id === -6)!;
        await act(async () => {
            await result.current.moveTreeNode({ ...liga2, parent: HANDBALL });
        });
        expect(result.current.tree.find((node) => node.id === -6)?.parent).toBe(HANDBALL);

        act(() => result.current.reset());
        expect(result.current.tree.find((node) => node.id === -6)?.parent).toBe(FUSSBALL);
    });
});
