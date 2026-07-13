// Shared gating logic for confirming a transaction ("Bestätigen"). Both the transaction detail drawer and the receipt
// (Beleg) review drawer confirm the *same* transaction and must therefore apply identical rules, so the check lives
// here rather than being duplicated per screen.
//
// A transaction may only be confirmed (DRAFT → CONFIRMED) when all mandatory fields are set AND its amount is exactly
// covered by the linked bank transactions. Saving a draft never requires this — incomplete drafts are always allowed.

// The keys returned in `missing`; each maps to an i18n string under `transactions.confirmBlockers.*`.
export type ConfirmBlocker = 'amount' | 'date' | 'counterparty' | 'name' | 'bommel' | 'coverage';

export interface TransactionConfirmFields {
    // Unsigned amount as entered in the form (absolute value is used); null/NaN when empty.
    amount: number | null;
    // ISO date string (YYYY-MM-DD) or empty.
    date: string | null;
    // Counterparty name (issuer for an expense, recipient for income). Empty when not set.
    counterparty: string | null;
    // Transaction description / "Bezeichnung". Empty when not set.
    name: string | null;
    // Assigned Bommel (organizational unit) id. null/0 when not yet assigned — allowed for a draft, required to confirm.
    bommelId: number | null;
}

export interface BankTxAmount {
    amount?: number | null;
}

export interface TransactionConfirmState {
    canConfirm: boolean;
    missing: ConfirmBlocker[];
}

// Money is compared in integer cents so that e.g. 12.10 + 0.00 rounding noise never blocks an otherwise exact match.
function toCents(value: number): number {
    return Math.round(value * 100);
}

/**
 * Determines whether a draft transaction may be confirmed and, if not, which requirements are still missing.
 *
 * @param fields         the current (possibly unsaved) form values
 * @param linkedBankTxns bank transactions currently matched to the transaction
 */
export function getTransactionConfirmState(fields: TransactionConfirmFields, linkedBankTxns: BankTxAmount[]): TransactionConfirmState {
    const missing: ConfirmBlocker[] = [];

    const amountCents = fields.amount != null && !Number.isNaN(fields.amount) ? Math.abs(toCents(fields.amount)) : 0;
    if (amountCents === 0) missing.push('amount');
    if (!fields.date) missing.push('date');
    if (!fields.counterparty || !fields.counterparty.trim()) missing.push('counterparty');
    if (!fields.name || !fields.name.trim()) missing.push('name');
    // A Bommel may be deferred while the transaction is a draft, but it must be assigned before it can be confirmed.
    if (!fields.bommelId) missing.push('bommel');

    // Exact coverage: the linked bank movements must sum to exactly the transaction amount. The *signed* amounts are
    // summed and only then taken in magnitude, so opposite movements net out correctly (e.g. -5, +5, -5 covers a 5
    // expense). Summing absolute values instead would wrongly over-count them (to 15) and grey out the confirm button.
    const coveredCents = Math.abs(linkedBankTxns.reduce((sum, b) => sum + toCents(Number(b.amount ?? 0)), 0));
    if (amountCents === 0 || coveredCents !== amountCents) missing.push('coverage');

    return { canConfirm: missing.length === 0, missing };
}
