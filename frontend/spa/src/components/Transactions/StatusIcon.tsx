import type { TransactionDisplayStatus } from '@/lib/transactionStatus';

/** Transaction display statuses, plus a receipt that has not been checked yet */
export type StatusIconKind = TransactionDisplayStatus | 'UNREVIEWED';

const STATUS_ICON_COLOR: Record<StatusIconKind, string> = {
    DRAFT: 'var(--info)',
    PARTIAL: 'var(--primary)',
    LINKED: 'var(--warning)',
    CONFIRMED: 'var(--positive)',
    UNREVIEWED: 'var(--info)',
};

/**
 * Minimal status mark that reads as progress: how much of the amount the bank covers.
 * Dashed ring = nothing yet (Entwurf, or an unchecked receipt), half ring = part (Teilverknüpft),
 * full = all (Verknüpft), ring with check = confirmed (Bestätigt). Decorative: pair it with a label or tooltip.
 */
export function StatusIcon({ kind, size = 12 }: { kind: StatusIconKind; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" className="flex-shrink-0" style={{ color: STATUS_ICON_COLOR[kind] }}>
            {kind === 'DRAFT' || kind === 'UNREVIEWED' ? (
                <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.3 1.43" />
            ) : (
                <circle cx="6" cy="6" r="4.75" fill={kind === 'LINKED' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
            )}
            {kind === 'PARTIAL' && <path d="M6 1.25 A4.75 4.75 0 0 1 6 10.75 Z" fill="currentColor" />}
            {kind === 'CONFIRMED' && (
                <path d="M3.9 6.1 5.4 7.6 8.2 4.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
        </svg>
    );
}

export default StatusIcon;
