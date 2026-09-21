import type { TransactionResponse } from '@hopps/api-client';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { FONT } from './layout';

import { InfoTooltip } from '@/components/ui/InfoTooltip';

import { getTransactionDisplayStatus, type TransactionDisplayStatus } from '@/lib/transactionStatus';
import { cn } from '@/lib/utils';

export type BadgeTone = 'pos' | 'neg' | 'purple' | 'warn' | 'info' | 'neutral';

const TONE: Record<BadgeTone, string> = {
    pos: 'bg-[var(--positive-surface)] text-[var(--positive)]',
    neg: 'bg-[var(--negative-surface)] text-[var(--negative)]',
    purple: 'bg-[var(--accent-surface)] text-purple-700',
    warn: 'bg-[var(--warning-surface)] text-[var(--warning)]',
    info: 'bg-[var(--info-surface)] text-[var(--info)]',
    neutral: 'bg-[var(--surface-track)] text-muted-foreground',
};

const SIZE = {
    md: 'px-2.5 py-1 text-[12.5px]',
    // The detail drawer shows the status prominently, next to the title.
    lg: 'px-3.5 py-1.5 text-[14px]',
} as const;

/** Small status pill. */
export function Badge({ tone = 'neutral', size = 'md', children }: { tone?: BadgeTone; size?: keyof typeof SIZE; children: ReactNode }) {
    return (
        <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-bold', SIZE[size], TONE[tone])} style={{ fontFamily: FONT }}>
            {children}
        </span>
    );
}

// Colour and i18n key per display status. Text only, no icon.
export const STATUS_STYLE: Record<TransactionDisplayStatus, { tone: BadgeTone; labelKey: string; hintKey: string }> = {
    DRAFT: { tone: 'info', labelKey: 'transactions.status.draft', hintKey: 'transactions.status.hint.draft' },
    PARTIAL: { tone: 'purple', labelKey: 'transactions.status.partial', hintKey: 'transactions.status.hint.partial' },
    LINKED: { tone: 'warn', labelKey: 'transactions.status.linked', hintKey: 'transactions.status.hint.linked' },
    CONFIRMED: { tone: 'pos', labelKey: 'transactions.status.confirmed', hintKey: 'transactions.status.hint.confirmed' },
};

/**
 * Status of a transaction: Entwurf, Teilverknüpft, Verknüpft or Bestätigt. With `withInfo` an info icon inside the badge
 * explains what the status means.
 */
export function StatusBadge({
    tx,
    size,
    withInfo = false,
}: {
    tx: Pick<TransactionResponse, 'status' | 'total' | 'coveredAmount'>;
    size?: keyof typeof SIZE;
    withInfo?: boolean;
}) {
    const { t } = useTranslation();
    const { tone, labelKey, hintKey } = STATUS_STYLE[getTransactionDisplayStatus(tx)];
    return (
        <Badge tone={tone} size={size}>
            {t(labelKey)}
            {withInfo && (
                <InfoTooltip
                    content={t(hintKey)}
                    label={t(hintKey)}
                    size={size === 'lg' ? 16 : 14}
                    align="end"
                    className="text-current opacity-70 hover:text-current hover:opacity-100"
                />
            )}
        </Badge>
    );
}
