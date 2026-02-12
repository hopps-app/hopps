import React, { Component, ReactNode } from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';

interface Props extends WithTranslation {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundaryInner extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        // TODO: Send to error tracking service (e.g., Sentry)
    }

    handleReset = (): void => {
        this.setState({ hasError: false, error: undefined });
    };

    handleGoHome = (): void => {
        this.setState({ hasError: false, error: undefined });
        window.location.href = '/dashboard';
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <ErrorFallback
                    error={this.state.error}
                    onReset={this.handleReset}
                    onGoHome={this.handleGoHome}
                    t={this.props.t}
                />
            );
        }

        return this.props.children;
    }
}

// Export the wrapped component with translation
export const ErrorBoundary = withTranslation()(ErrorBoundaryInner);

interface ErrorFallbackProps {
    error?: Error;
    onReset?: () => void;
    onGoHome?: () => void;
    t: (key: string) => string;
}

function ErrorFallback({ error, onReset, onGoHome, t }: ErrorFallbackProps): React.JSX.Element {
    return (
        <div role="alert" className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
            <div className="rounded-full bg-destructive/10 p-4 mb-4">
                <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2" data-testid="error-boundary-title">
                {t('errors.boundary.title')}
            </h2>
            <p className="text-muted-foreground mb-4 max-w-md" data-testid="error-boundary-description">
                {t('errors.boundary.description')}
            </p>
            {error && import.meta.env.DEV && (
                <pre className="mt-2 p-4 bg-muted rounded-md text-sm text-left overflow-auto max-w-full mb-4" data-testid="error-boundary-details">
                    <code>{error.message}</code>
                </pre>
            )}
            <div className="flex gap-3">
                {onReset && (
                    <Button onClick={onReset} variant="outline" data-testid="error-boundary-try-again">
                        {t('errors.boundary.tryAgain')}
                    </Button>
                )}
                {onGoHome && (
                    <Button onClick={onGoHome} data-testid="error-boundary-go-home">
                        {t('errors.boundary.goHome')}
                    </Button>
                )}
            </div>
        </div>
    );
}

export default ErrorBoundary;
