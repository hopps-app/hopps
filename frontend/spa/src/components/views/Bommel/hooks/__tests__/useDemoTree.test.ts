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

    it('adds, renames and deletes bommels in memory, and reset brings the example back', async () => {
        const { result } = renderHook(() => useDemoTree(false));
        const countBefore = result.current.tree.length;

        let createdId: number | boolean = false;
        await act(async () => {
            createdId = await result.current.createChildBommel(HANDBALL);
        });
        expect(typeof createdId).toBe('number');
        const created = result.current.tree.find((node) => node.id === createdId)!;
        expect(created.parent).toBe(HANDBALL);
        expect(result.current.tree).toHaveLength(countBefore + 1);

        await act(async () => {
            await result.current.updateTreeNode({ ...created, text: 'Beachhandball', data: { ...created.data, emoji: 'beach_with_umbrella' } });
        });
        expect(result.current.tree.find((node) => node.id === createdId)?.text).toBe('Beachhandball');

        // Deleting Fußball takes its sub-bommels along: 1. Liga, 2. Liga and Fanartikel
        await act(async () => {
            await result.current.deleteTreeNode(FUSSBALL);
        });
        expect(result.current.tree.some((node) => [FUSSBALL, -5, -6, -7].includes(Number(node.id)))).toBe(false);

        // The root cannot be deleted
        await act(async () => {
            expect(await result.current.deleteTreeNode(ROOT)).toBe(false);
        });

        act(() => result.current.reset());
        expect(result.current.tree).toHaveLength(countBefore);
        expect(result.current.tree.some((node) => node.id === createdId)).toBe(false);
    });

    it('reports what deleting a bommel would touch, without asking the server', () => {
        const { result } = renderHook(() => useDemoTree(false));
        // Fußball 6 + 1. Liga 5 + 2. Liga 8 + Fanartikel 5 transactions
        expect(result.current.deleteImpact(FUSSBALL)).toEqual({
            loading: false,
            transactionCount: 24,
            confirmedTransactionCount: 0,
            receiptCount: 0,
            confirmedReceiptCount: 0,
        });
    });
});
