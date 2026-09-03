/** Money and date formatting shared by the bank-account drawers, so the same movement reads identically in each. */

export function fmtCurrency(amount: number | undefined, currency = 'EUR'): string {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);
}

export function fmtDate(date: string | Date | undefined): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
