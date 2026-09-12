import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NoAccessView } from '@/components/NoAccessView';
import authService from '@/services/auth/auth.service';
import { useStore } from '@/store/store';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';

vi.mock('@/services/auth/auth.service', () => ({
    default: { logout: vi.fn().mockResolvedValue(undefined) },
}));

describe('NoAccessView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useStore.setState({
            instance: { tenancy: 'single', setupRequired: false, organizationName: 'Musterverein e.V.' },
            user: { id: 'u1', name: 'Kim Rakete', email: 'kim@example.test' },
        });
    });

    it('names the organization the account is not a member of and offers nothing but logout', async () => {
        renderWithProviders(<NoAccessView />);

        expect(screen.getByRole('heading', { name: 'No access' })).toBeInTheDocument();
        expect(screen.getByText('Your account is not a member of Musterverein e.V. yet.')).toBeInTheDocument();
        expect(screen.getByText('Signed in as kim@example.test')).toBeInTheDocument();
        // No way to create an organization here, unlike the multi-tenant screen.
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
        expect(authService.logout).toHaveBeenCalled();
    });

    it('falls back to a generic message while the organization name is unknown', () => {
        useStore.setState({ instance: { tenancy: 'single', setupRequired: false, organizationName: null } });
        renderWithProviders(<NoAccessView />);

        expect(screen.getByText('Your account is not a member of this organization yet.')).toBeInTheDocument();
    });
});
