import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';

import Header from '../Header';

// Pin the Keycloak mode, where registration is offered: a developer's .env.local may point the SPA at an OIDC provider.
vi.mock('@/services/auth/auth.config.ts', () => ({
    oidcProviderUrl: undefined,
    oidcClientId: undefined,
    isSelfRegistrationEnabled: true,
}));

describe('Header', () => {
    test('renders the header with login and register buttons', () => {
        render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );

        expect(screen.getByText('header.login')).toBeInTheDocument();
        expect(screen.getByText('header.register')).toBeInTheDocument();
    });

    test('hides the auth buttons on the registration page', () => {
        render(
            <MemoryRouter initialEntries={['/register']}>
                <Header />
            </MemoryRouter>
        );

        expect(screen.queryByText('header.login')).not.toBeInTheDocument();
        expect(screen.queryByText('header.register')).not.toBeInTheDocument();
    });
});
