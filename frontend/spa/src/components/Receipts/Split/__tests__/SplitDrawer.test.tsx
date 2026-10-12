import { DocumentResponse, TransactionResponse } from '@hopps/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SplitDrawer } from '../SplitDrawer';

import { fireEvent, renderWithProviders, screen } from '@/test/test-utils';

const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });
const mocks = vi.hoisted(() => ({
    savedParts: [] as unknown[],
    replace: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock('@/hooks/queries/useDocuments', () => ({
    useDocument: () => ({ data: undefined }),
    useDocumentTransactions: () => ({ data: mocks.savedParts, isLoading: false }),
    useUpdateDocument: () => mutation(),
    useReplaceDocumentTransactions: () => mocks.replace,
}));
vi.mock('@/hooks/queries/useCategoryGroups', () => ({ useCategoryGroups: () => ({ data: [] }) }));
vi.mock('@/hooks/queries/useBankAccounts', () => ({ useBankTransactionsForTransaction: () => ({ data: [] }) }));
vi.mock('@/hooks/queries/useTransactions', () => ({ useConfirmTransaction: () => mutation() }));
vi.mock('@/components/Receipts/DocumentFilePreview', () => ({ DocumentFilePreview: () => null }));
vi.mock('@/components/Transactions/BankMatchSection', () => ({ BankMatchSection: () => null }));
// Picking a bommel is all the rows need here; the real picker talks to the store.
vi.mock('@/components/Dashboard/BommelSelect', () => ({
    ALL_BOMMELS: 'all',
    BommelSelect: ({ value, onChange, triggerClassName }: { value: string | number; onChange: (v: string | number) => void; triggerClassName?: string }) => (
        <button type="button" data-testid="bommel-select" data-warn={String(!!triggerClassName?.includes('warning'))} onClick={() => onChange(7)}>
            {String(value)}
        </button>
    ),
}));

function renderDrawer(documentStatus = 'ANALYZED') {
    const doc = new DocumentResponse({ id: 1, name: 'Sommerfest', total: 300, documentStatus, direction: 'INCOMING' });
    renderWithProviders(<SplitDrawer doc={doc} startInEdit onClose={vi.fn()} />);
}

describe('SplitDrawer', () => {
    beforeEach(() => {
        mocks.savedParts = [];
        mocks.replace.mutateAsync.mockReset();
    });

    it('keeps "create" disabled while the split is incomplete and enables it once every part is complete', () => {
        renderDrawer();

        const create = screen.getByRole('button', { name: /Create 2 transactions/ });
        // Both parts lack a bommel and the new part has no amount yet: no click needed to find out.
        expect(create).toBeDisabled();

        screen.getAllByTestId('bommel-select').forEach((select) => fireEvent.click(select));
        expect(create).toBeDisabled();

        fireEvent.change(screen.getAllByLabelText('Amount')[1], { target: { value: '100,00' } });
        expect(create).toBeEnabled();
    });

    it('explains the disabled button and marks the missing fields on hover', () => {
        renderDrawer();

        // The tooltip names what is missing per part.
        expect(screen.getByText('Not complete yet')).toBeInTheDocument();
        expect(screen.getByText('Part 1: Bommel')).toBeInTheDocument();
        expect(screen.getByText('Part 2: Amount, Bommel')).toBeInTheDocument();

        // Untouched fields are not flagged up front, only once the user reaches for the button.
        const selects = () => screen.getAllByTestId('bommel-select').map((s) => s.getAttribute('data-warn'));
        expect(selects()).toEqual(['false', 'false']);
        fireEvent.mouseEnter(screen.getByRole('button', { name: /Create 2 transactions/ }).parentElement!);
        expect(selects()).toEqual(['true', 'true']);
    });

    it('adds a transaction to a confirmed receipt: the existing one stays the first part and is updated in place', async () => {
        mocks.savedParts = [new TransactionResponse({ id: 42, name: 'Hotel', total: -300, bommelId: 7, status: 'DRAFT' })];
        renderDrawer('CONFIRMED');

        // Part 1 is the existing transaction (bommel set, takes the rest), part 2 is new and still empty.
        const selects = screen.getAllByTestId('bommel-select');
        expect(selects.map((x) => x.textContent)).toEqual(['7', 'all']);

        fireEvent.click(selects[1]);
        fireEvent.change(screen.getAllByLabelText('Amount')[1], { target: { value: '120,00' } });
        fireEvent.click(screen.getByRole('button', { name: /Create 2 transactions/ }));

        await vi.waitFor(() => expect(mocks.replace.mutateAsync).toHaveBeenCalled());
        const { parts, confirmDocument } = mocks.replace.mutateAsync.mock.calls[0][0];
        expect(confirmDocument).toBe(true);
        expect(parts).toEqual([
            expect.objectContaining({ id: 42, amount: 180, bommelId: 7 }),
            expect.objectContaining({ id: undefined, amount: 120, bommelId: 7 }),
        ]);
    });
});
