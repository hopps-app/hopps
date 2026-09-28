import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import SetupGuard from '@/guards/SetupGuard';
import type { InstanceInfo } from '@/services/instance/instanceService';
import { useStore } from '@/store/store';

function renderRegisterRoute(instance: InstanceInfo | null) {
    useStore.setState({ instance });
    render(
        <MemoryRouter initialEntries={['/register']}>
            <Routes>
                <Route path="/" element={<span>home</span>} />
                <Route
                    path="/register"
                    element={
                        <SetupGuard>
                            <span>register form</span>
                        </SetupGuard>
                    }
                />
            </Routes>
        </MemoryRouter>
    );
}

describe('SetupGuard', () => {
    beforeEach(() => {
        useStore.setState({ instance: null });
    });

    it('keeps sign-up open on a multi-tenant installation', () => {
        renderRegisterRoute({ tenancy: 'multi', setupRequired: false, organizationName: null });
        expect(screen.getByText('register form')).toBeInTheDocument();
    });

    it('keeps sign-up open before the instance facts are known', () => {
        renderRegisterRoute(null);
        expect(screen.getByText('register form')).toBeInTheDocument();
    });

    it('shows the initial setup of a single-tenant installation while it is pending', () => {
        renderRegisterRoute({ tenancy: 'single', setupRequired: true, organizationName: null });
        expect(screen.getByText('register form')).toBeInTheDocument();
    });

    it('sends people home once a single-tenant installation is set up', () => {
        renderRegisterRoute({ tenancy: 'single', setupRequired: false, organizationName: 'Musterverein e.V.' });
        expect(screen.queryByText('register form')).not.toBeInTheDocument();
        expect(screen.getByText('home')).toBeInTheDocument();
    });
});
