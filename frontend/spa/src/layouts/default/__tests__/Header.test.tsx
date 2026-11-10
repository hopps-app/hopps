import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import Header from '../Header';

import { useStore } from '@/store/store';

// The real selector loads the app's i18n instance, which would turn the keys these tests look for into texts.
vi.mock('@/components/common/LanguageSelector/LanguageSelector', () => ({
    default: () => <div data-testid="language-selector" />,
}));

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

    test('offers the language switch to visitors, also on the registration page', () => {
        render(
            <MemoryRouter initialEntries={['/register']}>
                <Header />
            </MemoryRouter>
        );

        expect(screen.getByTestId('language-selector')).toBeInTheDocument();
    });

    test('leaves the language to the profile settings once logged in', () => {
        useStore.setState({ isAuthenticated: true });
        render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );

        expect(screen.queryByTestId('language-selector')).not.toBeInTheDocument();
    });

    test('replaces the register button with the initial setup while a single-tenant installation is not set up', () => {
        useStore.setState({ instance: { tenancy: 'single', setupRequired: true, organizationName: null } });
        render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );

        expect(screen.getByText('header.login')).toBeInTheDocument();
        expect(screen.getByText('home.setup')).toBeInTheDocument();
        expect(screen.queryByText('header.register')).not.toBeInTheDocument();
    });

    test('shows only the login once a single-tenant installation is set up', () => {
        useStore.setState({ instance: { tenancy: 'single', setupRequired: false, organizationName: 'Musterverein e.V.' } });
        render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );

        expect(screen.getByText('header.login')).toBeInTheDocument();
        expect(screen.queryByText('header.register')).not.toBeInTheDocument();
        expect(screen.queryByText('home.setup')).not.toBeInTheDocument();
    });
});
