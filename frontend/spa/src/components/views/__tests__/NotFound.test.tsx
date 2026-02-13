import { describe, it, expect } from 'vitest';

import NotFoundView from '../NotFoundView';

import { renderWithProviders, screen } from '@/test/test-utils';

describe('NotFoundView', () => {
    it('renders 404 page with translated content', () => {
        renderWithProviders(<NotFoundView />);
        expect(screen.getByRole('heading')).toBeInTheDocument();
        expect(screen.getByText('The page you are looking for does not exist.')).toBeInTheDocument();
    });

    it('renders a button to navigate back to dashboard', () => {
        renderWithProviders(<NotFoundView />);
        const button = screen.getByRole('button', { name: 'Go to Dashboard' });
        expect(button).toBeInTheDocument();
    });
});
