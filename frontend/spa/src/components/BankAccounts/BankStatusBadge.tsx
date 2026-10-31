import { useTranslation } from 'react-i18next';

import { Badge, type BadgeTone } from '@/components/Transactions/StatusBadge';

export type BankTransactionStatusValue = 'UNMATCHED' | 'PARTIALLY_MATCHED' | 'FULLY_MATCHED' | 'IGNORED';

/**
 * Label and colours per bank movement status, aligned with the transaction statuses: Offen like Entwurf (nothing linked
 * yet), Teilverknüpft like Teilverknüpft, Zugeordnet green (done), Ignoriert grey. `color`/`tint` are the same colours
 * for the status filter's counts.
 */
export const BANK_STATUS_STYLE: Record<BankTransactionStatusValue, { tone: BadgeTone; labelKey: string; color: string; tint: string }> = {
    UNMATCHED: { tone: 'info', labelKey: 'konten.status.open', color: 'var(--info)', tint: 'var(--info-surface)' },
    PARTIALLY_MATCHED: { tone: 'purple', labelKey: 'konten.status.partial', color: 'var(--purple-700)', tint: 'var(--accent-surface)' },
    FULLY_MATCHED: { tone: 'pos', labelKey: 'konten.status.matched', color: 'var(--positive)', tint: 'var(--positive-surface)' },
    IGNORED: { tone: 'neutral', labelKey: 'konten.status.ignored', color: 'var(--muted-foreground)', tint: 'var(--surface-track)' },
};

/** Status pill of a bank movement, text only, in the same style as the transaction status badge. */
export function BankStatusBadge({ status }: { status?: string }) {
    const { t } = useTranslation();
    const style = BANK_STATUS_STYLE[(status ?? 'UNMATCHED') as BankTransactionStatusValue] ?? BANK_STATUS_STYLE.UNMATCHED;
    return <Badge tone={style.tone}>{t(style.labelKey)}</Badge>;
}
