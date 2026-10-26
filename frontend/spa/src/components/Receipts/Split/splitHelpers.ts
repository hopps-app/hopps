import type { TransactionResponse } from '@hopps/api-client';

import { addPart, createPart, formatPartAmount, type SplitPart } from '@/lib/splitParts';

export const EPSILON = 0.005;

export function fmtDate(date: Date | string | null | undefined): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function toIsoDate(date: Date | string | null | undefined): string {
    return date ? new Date(date).toISOString().slice(0, 10) : '';
}

export function categoryValuesOf(tx: TransactionResponse): Record<number, string> {
    const values: Record<number, string> = {};
    (tx.categoryValues ?? []).forEach((c) => {
        if (c.groupId != null && c.value != null) values[c.groupId] = c.value;
    });
    return values;
}

/** A saved transaction as an editable part; the id is kept so saving updates it in place. */
export function fromTransaction(tx: TransactionResponse): SplitPart {
    return createPart({
        id: tx.id,
        name: tx.name ?? '',
        amount: formatPartAmount(Math.abs(Number(tx.total ?? 0))),
        bommelId: tx.bommelId ?? null,
        categoryValues: categoryValuesOf(tx),
    });
}

/** How much of a part's amount the linked bank movements cover (magnitude, capped at the amount). */
export function coveredOf(tx: TransactionResponse): number {
    const total = Number(tx.total ?? 0);
    const covered = tx.coveredAmount != null ? Number(tx.coveredAmount) : 0;
    if (total === 0 || covered === 0 || Math.sign(total) !== Math.sign(covered)) return 0;
    return Math.min(Math.abs(covered), Math.abs(total));
}

/**
 * The parts a split starts with. Saved transactions are taken over as they are (an existing split is continued). A
 * receipt that is not split yet starts with two parts: the first carries what the form had chosen (bommel and category
 * values, or the one existing transaction) and takes the rest of the amount, the second is new and empty.
 */
export function seedSplitParts(
    saved: TransactionResponse[],
    total: number,
    fallback: { bommelId: number | null; categoryValues: Record<number, string> }
): SplitPart[] {
    if (saved.length > 1) return saved.map(fromTransaction);
    const first =
        saved.length === 1
            ? { ...fromTransaction(saved[0]), rest: true }
            : createPart({ bommelId: fallback.bommelId, categoryValues: fallback.categoryValues, rest: true });
    return addPart([first], total);
}
