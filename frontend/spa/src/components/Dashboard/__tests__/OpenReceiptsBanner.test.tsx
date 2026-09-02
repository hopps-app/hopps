import { describe, expect, it } from 'vitest';

import { OpenReceiptsBanner } from '../OpenReceiptsBanner';

import { renderWithProviders, screen } from '@/test/test-utils';

describe('OpenReceiptsBanner', () => {
    it('carries the number in the heading, with the explanation below it', () => {
        renderWithProviders(<OpenReceiptsBanner count={7} isLoading={false} />);

        expect(screen.getByTestId('dashboard-open-receipts-count')).toHaveTextContent('7 open receipts');
        expect(screen.getByText('They are not yet linked to a booking.')).toBeInTheDocument();
        expect(screen.getByTestId('dashboard-open-receipts-action')).toBeInTheDocument();
    });

    it('uses the singular for a single receipt', () => {
        renderWithProviders(<OpenReceiptsBanner count={1} isLoading={false} />);

        expect(screen.getByTestId('dashboard-open-receipts-count')).toHaveTextContent('1 open receipt');
        expect(screen.getByText('It is not yet linked to a booking.')).toBeInTheDocument();
    });

    it('disappears entirely when there is nothing to review', () => {
        renderWithProviders(<OpenReceiptsBanner count={0} isLoading={false} />);

        expect(screen.queryByTestId('dashboard-open-receipts-banner')).not.toBeInTheDocument();
    });
});
