import { LucideIcon, RefreshCw } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Skeleton } from './SectionState';

import { Card } from '@/components/ui/Card';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { cn } from '@/lib/utils';
import { getUserFriendlyErrorMessage, isNetworkError } from '@/utils/errorUtils';

export type KpiCardProps = {
    label: string;
    /** Preformatted amount. Never a spinner once loaded — a new organization legitimately shows 0. */
    value: string;
    context: string;
    /** Positive means "good news" (more income, fewer expenses), not "went up". */
    tone?: 'positive' | 'neutral';
    icon: LucideIcon;
    isLoading?: boolean;
    error?: unknown;
    onRetry?: () => void;
    'data-testid'?: string;
};

export function KpiCard({ label, value, context, tone = 'neutral', icon: Icon, isLoading, error, onRetry, 'data-testid': testId }: KpiCardProps) {
    const { t } = useTranslation();
    const labelId = useId();

    return (
        <Card
            role="group"
            aria-labelledby={labelId}
            aria-busy={isLoading}
            className="min-w-0 flex-1 gap-0 rounded-[20px] border-border-soft bg-background-secondary px-[22px] py-5 shadow-card"
            data-testid={testId}
        >
            <div className="flex items-center justify-between gap-3">
                <span id={labelId} className="text-sm font-bold text-muted-foreground">
                    {label}
                </span>
                <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-purple-100 text-purple-700">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
            </div>

            {isLoading ? (
                <Skeleton className="mt-3 h-9 w-32" />
            ) : (
                <p className="mt-3 text-[29px] font-extrabold leading-none tracking-tight tabular-nums" data-testid={testId ? `${testId}-value` : undefined}>
                    {error ? '—' : value}
                </p>
            )}

            {isLoading ? (
                <Skeleton className="mt-3 h-4 w-40" />
            ) : error ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-destructive">
                        {isNetworkError(error) ? t('errors.network.title') : getUserFriendlyErrorMessage(error)}
                    </span>
                    {onRetry && (
                        <BaseButton
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-2 text-xs"
                            onClick={onRetry}
                            data-testid={testId ? `${testId}-retry` : undefined}
                        >
                            <RefreshCw className="h-3 w-3" aria-hidden="true" />
                            {t('errors.api.retry')}
                        </BaseButton>
                    )}
                </div>
            ) : (
                <p className={cn('mt-2 text-xs font-bold', tone === 'positive' ? 'text-[var(--positive)]' : 'text-muted-foreground/70')}>{context}</p>
            )}
        </Card>
    );
}
