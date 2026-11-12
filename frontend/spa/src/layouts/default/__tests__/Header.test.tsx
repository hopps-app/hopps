import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test } from 'vitest';

import Header from '../Header';

import { useStore } from '@/store/store';

describe('Header', () => {
    beforeEach(() => {
        useStore.setState({ instance: null, isAuthenticated: false });
    });

    test('renders the header with login and register buttons', () => {
        render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );

        expect(screen.getByText('Login')).toBeInTheDocument();
        expect(screen.getByText('Register')).toBeInTheDocument();
    });

    test('hides the auth buttons on the registration page', () => {
        render(
            <MemoryRouter initialEntries={['/register']}>
                <Header />
            </MemoryRouter>
        );

        expect(screen.queryByText('Login')).not.toBeInTheDocument();
        expect(screen.queryByText('Register')).not.toBeInTheDocument();
    });

    test('replaces the register button with the initial setup while a single-tenant installation is not set up', () => {
        useStore.setState({ instance: { tenancy: 'single', setupRequired: true, organizationName: null } });
        render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );

        expect(screen.getByText('Login')).toBeInTheDocument();
        expect(screen.getByText('Initial setup')).toBeInTheDocument();
        expect(screen.queryByText('Register')).not.toBeInTheDocument();
    });

    test('shows only the login once a single-tenant installation is set up', () => {
        useStore.setState({ instance: { tenancy: 'single', setupRequired: false, organizationName: 'Musterverein e.V.' } });
        render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );

        expect(screen.getByText('Login')).toBeInTheDocument();
        expect(screen.queryByText('Register')).not.toBeInTheDocument();
        expect(screen.queryByText('Initial setup')).not.toBeInTheDocument();
    });
});
