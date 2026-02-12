import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

import { renderWithProviders, screen } from '@/test/test-utils';

// Component that throws an error for testing
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) {
        throw new Error('Test error message');
    }
    return <div>No error</div>;
}

describe('ErrorBoundary', () => {
    beforeEach(() => {
        // Suppress console.error for cleaner test output
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('renders children when there is no error', () => {
        renderWithProviders(
            <ErrorBoundary>
                <ThrowError shouldThrow={false} />
            </ErrorBoundary>
        );

        expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('renders error fallback when child throws', () => {
        renderWithProviders(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByRole('alert')).toBeInTheDocument();
        // Uses i18n key errors.boundary.title
        expect(screen.getByTestId('error-boundary-title')).toBeInTheDocument();
    });

    it('renders custom fallback when provided', () => {
        const customFallback = <div>Custom error message</div>;

        renderWithProviders(
            <ErrorBoundary fallback={customFallback}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('logs error to console', () => {
        const consoleSpy = vi.spyOn(console, 'error');

        renderWithProviders(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(consoleSpy).toHaveBeenCalled();
    });

    it('renders try again and go home buttons', () => {
        renderWithProviders(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByTestId('error-boundary-try-again')).toBeInTheDocument();
        expect(screen.getByTestId('error-boundary-go-home')).toBeInTheDocument();
    });
});
