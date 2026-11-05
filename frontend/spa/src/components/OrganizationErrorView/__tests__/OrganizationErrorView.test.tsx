import { ApiException } from '@hopps/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationErrorView } from '@/components/OrganizationErrorView';
import apiService from '@/services/ApiService';
import { fetchInstanceInfo } from '@/services/instance/instanceService';
import { useStore } from '@/store/store';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';

vi.mock('@/services/auth/auth.service', () => ({
    default: { logout: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/services/ApiService', () => ({
    default: { orgService: { myPOST: vi.fn() } },
}));

vi.mock('@/services/instance/instanceService', () => ({
    fetchInstanceInfo: vi.fn(),
}));

const SET_UP = { tenancy: 'single' as const, setupRequired: false, organizationName: 'Eigener Verein' };

describe('OrganizationErrorView on a single-tenant installation during the initial setup', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useStore.setState({
            instance: { tenancy: 'single', setupRequired: true, organizationName: null },
            organization: null,
            organizationError: true,
        });
        vi.mocked(fetchInstanceInfo).mockResolvedValue(SET_UP);
    });

    it('lets an existing account complete the setup and refreshes the instance', async () => {
        vi.mocked(apiService.orgService.myPOST).mockResolvedValue({ name: 'Eigener Verein' } as never);
        renderWithProviders(<OrganizationErrorView />);

        expect(screen.getByRole('heading', { name: 'Initial setup' })).toBeInTheDocument();

        await userEvent.type(screen.getByLabelText('Organization name'), 'Eigener Verein');
        await userEvent.click(screen.getByRole('button', { name: 'Complete setup' }));

        expect(apiService.orgService.myPOST).toHaveBeenCalled();
        expect(useStore.getState().instance).toEqual(SET_UP);
        expect(useStore.getState().organizationError).toBe(false);
    });

    it('hands over to the no-access screen when someone else completed the setup first', async () => {
        vi.mocked(apiService.orgService.myPOST).mockRejectedValue(new ApiException('Setup complete', 403, '{"code":"SETUP_COMPLETE"}', {}, null));
        renderWithProviders(<OrganizationErrorView />);

        await userEvent.type(screen.getByLabelText('Organization name'), 'Eigener Verein');
        await userEvent.click(screen.getByRole('button', { name: 'Complete setup' }));

        // App.tsx shows the no-access screen once setupRequired is false and the account still has no organization.
        expect(useStore.getState().instance).toEqual(SET_UP);
        expect(useStore.getState().organizationError).toBe(true);
    });
});
