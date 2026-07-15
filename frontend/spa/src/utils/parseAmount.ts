// Parse a German ("1.234,56") or plain ("1234.56") decimal string to a number, or null if it is not a valid number.
// Used by the bank-reconciliation "amount used" inputs, which accept a locale-formatted value.
export function parseAllocationAmount(raw: string): number | null {
    const cleaned = raw
        .trim()
        .replace(/\s/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
}
