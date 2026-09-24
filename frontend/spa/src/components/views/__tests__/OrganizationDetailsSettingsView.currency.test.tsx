import type { Organization } from '@hopps/api-client';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OrganizationDetailsSettingsView from '../OrganizationDetailsSettingsView';

import { useStore } from '@/store/store';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('@/services/ApiService', () => ({
    default: {
        orgService: {
            members: vi.fn().mockResolvedValue([]),
            myGET: vi.fn(),
            myPUT: vi.fn(),
        },
    },
}));

function organization(overrides: Partial<Organization>): Organization {
    return { id: 1, slug: 'test-verein', name: 'Test e.V.', type: 'EINGETRAGENER_VEREIN', currency: 'EUR', ...overrides } as Organization;
}

/** The currency select is labelled; Radix renders its trigger as a combobox button. */
function currencySelect() {
    return screen.getByRole('combobox', { name: /accounting currency/i });
}

describe('OrganizationDetailsSettingsView – currency', () => {
    beforeEach(() => {
        useStore.setState({ organization: null, organizationError: false });
    });

    it('offers the currency for editing while the organization has no transactions', async () => {
        useStore.setState({ organization: organization({ currency: 'CHF', currencyLocked: false }) });
        renderWithProviders(<OrganizationDetailsSettingsView />);

        // The form is filled from the store in an effect; a value set that way must survive the Select's hidden
        // native mirror (see the empty-value guard in components/ui/Select.tsx).
        await waitFor(() => expect(currencySelect()).toHaveTextContent('Swiss franc (CHF)'));
        expect(currencySelect()).toBeEnabled();
        expect(screen.queryByTestId('currency-locked-note')).not.toBeInTheDocument();
        expect(screen.getByText(/can only be changed while no transaction has been created yet/i)).toBeInTheDocument();
    });

    it('locks the currency and explains why once transactions exist', async () => {
        useStore.setState({ organization: organization({ currency: 'EUR', currencyLocked: true }) });
        renderWithProviders(<OrganizationDetailsSettingsView />);

        await waitFor(() => expect(currencySelect()).toBeDisabled());
        expect(currencySelect()).toHaveTextContent('Euro (€)');
        const note = screen.getByTestId('currency-locked-note');
        expect(note).toHaveTextContent(/can no longer be changed/i);
        expect(note).toHaveTextContent(/delete all transactions first or contact support/i);
    });

    it('falls back to euro when the organization carries no currency yet', async () => {
        useStore.setState({ organization: organization({ currency: undefined }) });
        renderWithProviders(<OrganizationDetailsSettingsView />);

        await waitFor(() => expect(currencySelect()).toHaveTextContent('Euro (€)'));
    });
});
