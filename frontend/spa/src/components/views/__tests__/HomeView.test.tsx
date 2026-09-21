import { beforeEach, describe, expect, it, vi } from 'vitest';

import HomeView from '@/components/views/HomeView';
import type { InstanceInfo } from '@/services/instance/instanceService';
import { useStore } from '@/store/store';
import { renderWithProviders, screen } from '@/test/test-utils';

vi.mock('@/services/auth/auth.service.ts', () => ({
    default: { login: vi.fn().mockResolvedValue(undefined) },
}));

function renderHome(instance: InstanceInfo) {
    useStore.setState({
        instance,
        isInitialized: true,
        isAuthenticated: false,
        keycloakReachable: true,
        backendReachable: true,
    });
    renderWithProviders(<HomeView />);
}

describe('HomeView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('offers sign-up and login on the hosted SaaS', () => {
        renderHome({ tenancy: 'multi', setupRequired: false, organizationName: null });

        expect(screen.getByRole('button', { name: 'Register organization' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    it('offers only the initial setup while a single-tenant installation is not set up', () => {
        renderHome({ tenancy: 'single', setupRequired: true, organizationName: null });

        expect(screen.getByRole('button', { name: 'Start initial setup' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Login' })).not.toBeInTheDocument();
        expect(screen.getByText(/has not been set up yet/)).toBeInTheDocument();
    });

    it('offers only the login once a single-tenant installation is set up', () => {
        renderHome({ tenancy: 'single', setupRequired: false, organizationName: 'Musterverein e.V.' });

        expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Register organization' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Start initial setup' })).not.toBeInTheDocument();
        expect(screen.getByText('Accounting for Musterverein e.V.. Sign in with your account.')).toBeInTheDocument();
    });
});
