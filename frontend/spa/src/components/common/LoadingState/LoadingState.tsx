import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

interface LoadingStateProps {
    message?: string;
    fullScreen?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function LoadingState({ message, fullScreen, size = 'md', className }: LoadingStateProps) {
    const { t } = useTranslation();

    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };

    return (
        <div
            className={cn('flex flex-col items-center justify-center', fullScreen && 'min-h-screen', className)}
            role="status"
            aria-live="polite"
        >
            <svg
                className={cn('animate-spin text-primary', sizeClasses[size])}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
            </svg>
            <p className="text-muted-foreground mt-2 text-sm">
                <span className="sr-only">{t('common.loading')}</span>
                {message ?? t('common.loading')}
            </p>
        </div>
    );
}

export default LoadingState;
