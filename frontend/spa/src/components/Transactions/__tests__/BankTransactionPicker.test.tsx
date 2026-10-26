import { BankTransactionResponse } from '@hopps/api-client';
import { describe, expect, it, vi } from 'vitest';

import { BankTransactionPicker } from '../BankTransactionPicker';

import { fireEvent, renderWithProviders, screen, waitFor } from '@/test/test-utils';

const movements = [
    new BankTransactionResponse({ id: 1, amount: -120, counterpartyName: 'Getränke Huber', bookingDate: new Date('2026-09-04') }),
    new BankTransactionResponse({ id: 2, amount: -80, counterpartyName: 'Druckerei Schmid', bookingDate: new Date('2026-09-05') }),
];

vi.mock('@/hooks/queries/useBankAccounts', () => ({
    useBankTransactionSearch: () => ({ data: movements, isFetching: false }),
}));

function renderPicker() {
    const onLink = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
        <BankTransactionPicker txTotal={-120} open={120} linkedIds={new Set()} pending={false} onLink={onLink} onPreview={vi.fn()} onClose={vi.fn()} />
    );
    return onLink;
}

describe('BankTransactionPicker', () => {
    it('shows the amount and the link button in the selected row, not below the list', async () => {
        const onLink = renderPicker();
        expect(screen.queryByRole('button', { name: /Link/ })).not.toBeInTheDocument();

        const row = screen.getByText('Getränke Huber').closest('button')!;
        fireEvent.click(row);

        const link = screen.getByRole('button', { name: /Link/ });
        // Same row container as the movement that was clicked.
        expect(row.parentElement!.parentElement).toContainElement(link);
        expect(screen.getByRole('textbox', { name: 'Partial amount' })).toHaveValue('120,00');

        fireEvent.click(link);
        // The default allocation (what the transaction needs) is sent as a plain link.
        await waitFor(() => expect(onLink).toHaveBeenCalledWith(1, undefined));
    });

    it('moves the action along when another movement is selected', () => {
        renderPicker();

        fireEvent.click(screen.getByText('Getränke Huber').closest('button')!);
        const other = screen.getByText('Druckerei Schmid').closest('button')!;
        fireEvent.click(other);

        expect(screen.getAllByRole('button', { name: /Link/ })).toHaveLength(1);
        expect(other.parentElement!.parentElement).toContainElement(screen.getByRole('button', { name: /Link/ }));
    });
});
