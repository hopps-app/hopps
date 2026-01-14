import { Component, ReactNode } from 'react';

import Button from '@/components/ui/Button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
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

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
        }

        return this.props.children;
    }
}

interface ErrorFallbackProps {
    error?: Error;
    onReset?: () => void;
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps): JSX.Element {
    return (
        <div role="alert" className="flex flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-destructive/10 p-4 mb-4">
                <svg
                    className="h-8 w-8 text-destructive"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 max-w-md">
                An unexpected error occurred. Please try again or contact support if the problem persists.
            </p>
            {error && process.env.NODE_ENV === 'development' && (
                <pre className="mt-2 p-4 bg-muted rounded-md text-sm text-left overflow-auto max-w-full mb-4">
                    <code>{error.message}</code>
                </pre>
            )}
            {onReset && (
                <Button onClick={onReset} variant="outline">
                    Try again
                </Button>
            )}
        </div>
    );
}

export default ErrorBoundary;
