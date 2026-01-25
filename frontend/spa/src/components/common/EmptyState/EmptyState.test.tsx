import { Inbox } from 'lucide-react';
import { describe, it, expect, vi } from 'vitest';

import { EmptyState } from './EmptyState';

import { renderWithProviders, screen } from '@/test/test-utils';

describe('EmptyState', () => {
    it('renders title', () => {
        renderWithProviders(<EmptyState title="No items found" />);

        expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
        renderWithProviders(<EmptyState title="No items" description="Try adding some items" />);

        expect(screen.getByText('Try adding some items')).toBeInTheDocument();
    });

    it('renders icon when provided', () => {
        renderWithProviders(<EmptyState title="No items" icon={Inbox} />);

        // Icon should be rendered (check for the container)
        expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('renders action button when provided', () => {
        const handleClick = vi.fn();
        renderWithProviders(<EmptyState title="No items" action={{ label: 'Add Item', onClick: handleClick }} />);

        const button = screen.getByRole('button', { name: 'Add Item' });
        expect(button).toBeInTheDocument();

        button.click();
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not render description when not provided', () => {
        renderWithProviders(<EmptyState title="No items" />);

        expect(screen.queryByText('Try adding some items')).not.toBeInTheDocument();
    });

    it('does not render action button when not provided', () => {
        renderWithProviders(<EmptyState title="No items" />);

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
