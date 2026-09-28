import type { TransactionStatus } from '@hopps/api-client';

/**
 * The four states a transaction is shown in. The backend only stores DRAFT and CONFIRMED; the two in between are
 * derived from how much of the amount the linked bank movements cover.
 */
export type TransactionDisplayStatus = 'DRAFT' | 'PARTIAL' | 'LINKED' | 'CONFIRMED';

// Float tolerance for the covered/total comparison, same as the reconciliation in the detail drawer.
const EPSILON = 0.005;

export interface TransactionStatusFields {
    status?: TransactionStatus;
    total?: number | null;
    // Signed net of the linked bank movements (the backend's `coveredAmount`).
    coveredAmount?: number | null;
}

/**
 * DRAFT: nothing linked yet. PARTIAL: linked, but the movements do not add up to the amount. LINKED: exactly covered,
 * so it can be confirmed. CONFIRMED is passed through from the backend.
 */
export function getTransactionDisplayStatus(tx: TransactionStatusFields): TransactionDisplayStatus {
    if (tx.status === 'CONFIRMED') return 'CONFIRMED';
    const covered = tx.coveredAmount != null ? Number(tx.coveredAmount) : 0;
    if (Math.abs(covered) <= EPSILON) return 'DRAFT';
    const total = tx.total != null ? Number(tx.total) : 0;
    return Math.abs(total - covered) <= EPSILON ? 'LINKED' : 'PARTIAL';
}
