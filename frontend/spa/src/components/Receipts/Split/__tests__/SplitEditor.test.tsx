import { TransactionResponse } from '@hopps/api-client';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SplitEditor } from '../SplitEditor';
import { seedSplitParts } from '../splitHelpers';
import { useSplitEditor, type SplitEditorState } from '../useSplitEditor';

import type { SplitPart } from '@/lib/splitParts';
import { act, fireEvent, renderWithProviders, screen } from '@/test/test-utils';

vi.mock('@/hooks/queries/useCategoryGroups', () => ({ useCategoryGroups: () => ({ data: [] }) }));
// Picking a bommel is all the rows need here; the real picker talks to the store.
vi.mock('@/components/Dashboard/BommelSelect', () => ({
    ALL_BOMMELS: 'all',
    BommelSelect: ({ value, onChange, triggerClassName }: { value: string | number; onChange: (v: string | number) => void; triggerClassName?: string }) => (
        <button type="button" data-testid="bommel-select" data-warn={String(!!triggerClassName?.includes('warning'))} onClick={() => onChange(7)}>
            {String(value)}
        </button>
    ),
}));

/** Renders the editor like the review form does and exposes its state for the assertions. */
function Harness({
    total,
    initial,
    onState,
    onSinglePart,
}: {
    total: number;
    initial: SplitPart[];
    onState: (s: SplitEditorState) => void;
    onSinglePart?: (part: SplitPart) => void;
}) {
    const editor = useSplitEditor(total);
    useEffect(() => {
        editor.seed(initial);
        // Seeded once, like the form does per receipt.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    onState(editor);
    return <SplitEditor editor={editor} total={total} onSinglePart={onSinglePart} />;
}

function renderEditor(total: number, initial: SplitPart[], onSinglePart?: (part: SplitPart) => void) {
    const state: { current?: SplitEditorState } = {};
    renderWithProviders(<Harness total={total} initial={initial} onState={(s) => (state.current = s)} onSinglePart={onSinglePart} />);
    return state;
}

const noFallback = { bommelId: null, categoryValues: {} };

describe('seedSplitParts', () => {
    it('starts a new split with the form values as the rest part and an empty second part', () => {
        const parts = seedSplitParts([], 300, { bommelId: 7, categoryValues: { 10: 'Getränke' } });

        expect(parts).toHaveLength(2);
        expect(parts[0]).toMatchObject({ rest: true, bommelId: 7, categoryValues: { 10: 'Getränke' } });
        expect(parts[1]).toMatchObject({ rest: false, bommelId: null, amount: '0,00' });
    });

    it('keeps the one existing transaction as the first part', () => {
        const saved = [new TransactionResponse({ id: 42, name: 'Hotel', total: -300, bommelId: 7 })];
        const parts = seedSplitParts(saved, 300, noFallback);

        expect(parts.map((p) => p.id)).toEqual([42, undefined]);
        expect(parts[0]).toMatchObject({ rest: true, bommelId: 7, name: 'Hotel' });
    });

    it('continues an existing split as it is', () => {
        const saved = [new TransactionResponse({ id: 1, total: -200, bommelId: 7 }), new TransactionResponse({ id: 2, total: -100, bommelId: 8 })];
        const parts = seedSplitParts(saved, 300, noFallback);

        expect(parts.map((p) => [p.id, p.amount])).toEqual([
            [1, '200,00'],
            [2, '100,00'],
        ]);
    });
});

describe('SplitEditor', () => {
    it('blocks creating while a part is incomplete and lists why', () => {
        const state = renderEditor(300, seedSplitParts([], 300, noFallback));

        expect(state.current!.blocked).toBe(true);
        expect(state.current!.reasons).toEqual(['Part 1: Bommel', 'Part 2: Amount, Bommel']);

        screen.getAllByTestId('bommel-select').forEach((select) => fireEvent.click(select));
        fireEvent.change(screen.getAllByLabelText('Amount')[1], { target: { value: '100,00' } });

        expect(state.current!.blocked).toBe(false);
        expect(screen.getByText('Amounts add up')).toBeInTheDocument();
    });

    it('marks missing fields right away and explains them once the user reaches for "create"', () => {
        const state = renderEditor(300, seedSplitParts([], 300, noFallback));
        const warned = () => screen.getAllByTestId('bommel-select').map((s) => s.getAttribute('data-warn'));

        // The orange border shows at once, the text only after an attempt.
        expect(warned()).toEqual(['true', 'true']);
        expect(screen.queryByText('Please choose')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Add another part/ }));
        expect(warned()).toEqual(['true', 'true', 'true']);

        // Simulates hovering the disabled create button.
        act(() => state.current!.markAttempted());
        expect(screen.getAllByText('Please choose')).toHaveLength(3);
    });

    it('sends the existing transaction with its id and gives the rest of the amount to the first part', () => {
        const saved = [new TransactionResponse({ id: 42, name: 'Hotel', total: -300, bommelId: 7 })];
        const state = renderEditor(300, seedSplitParts(saved, 300, noFallback));

        fireEvent.click(screen.getAllByTestId('bommel-select')[1]);
        fireEvent.change(screen.getAllByLabelText('Amount')[1], { target: { value: '120,00' } });

        expect(state.current!.payloads()).toEqual([
            expect.objectContaining({ id: 42, amount: 180, bommelId: 7 }),
            expect.objectContaining({ id: undefined, amount: 120, bommelId: 7 }),
        ]);
        expect(state.current!.dirty).toBe(true);
    });
    it('reports the part that is left when removing parts leaves only one', () => {
        const onSinglePart = vi.fn();
        renderEditor(300, seedSplitParts([], 300, { bommelId: 7, categoryValues: { 10: 'Getränke' } }), onSinglePart);

        fireEvent.click(screen.getAllByLabelText('Remove part')[1]);

        expect(onSinglePart).toHaveBeenCalledTimes(1);
        expect(onSinglePart.mock.calls[0][0]).toMatchObject({ bommelId: 7, categoryValues: { 10: 'Getränke' } });
    });

    it('keeps splitting while at least two parts are left', () => {
        const onSinglePart = vi.fn();
        renderEditor(300, seedSplitParts([], 300, noFallback), onSinglePart);

        fireEvent.click(screen.getByRole('button', { name: /Add another part/ }));
        fireEvent.click(screen.getAllByLabelText('Remove part')[2]);

        expect(screen.getAllByLabelText('Remove part')).toHaveLength(2);
        expect(onSinglePart).not.toHaveBeenCalled();
    });
});
