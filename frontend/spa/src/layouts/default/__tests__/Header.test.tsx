import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';

import Header from '../Header';

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
