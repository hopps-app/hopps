import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { cn } from '@/lib/utils';
import { getUserFriendlyErrorMessage, isNetworkError } from '@/utils/errorUtils';

export function Skeleton({ className }: { className?: string }) {
    return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-grey-500/70 dark:bg-white/10', className)} />;
}

type SectionErrorProps = {
    error: unknown;
    onRetry: () => void;
    isRetrying?: boolean;
    className?: string;
    'data-testid'?: string;
};

/**
 * Failure of one dashboard section must not take the others down, so every section renders its own
 * message and its own retry instead of replacing the page.
 */
export function SectionError({ error, onRetry, isRetrying, className, 'data-testid': testId }: SectionErrorProps) {
    const { t } = useTranslation();
    const offline = isNetworkError(error);

    return (
        <div className={cn('flex flex-col items-center justify-center gap-3 text-center', className)} role="alert" data-testid={testId}>
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
                {offline ? <WifiOff className="h-5 w-5" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5" aria-hidden="true" />}
            </div>
            <p className="text-sm font-medium text-destructive">{offline ? t('errors.network.title') : getUserFriendlyErrorMessage(error)}</p>
            {offline && <p className="text-sm text-muted-foreground">{t('errors.network.description')}</p>}
            <BaseButton
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onRetry}
                disabled={isRetrying}
                data-testid={testId ? `${testId}-retry` : undefined}
            >
                <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} aria-hidden="true" />
                {isRetrying ? t('errors.network.retrying') : t('errors.api.retry')}
            </BaseButton>
        </div>
    );
}
