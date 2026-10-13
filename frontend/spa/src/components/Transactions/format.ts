// Money formatting deliberately does NOT live here: amounts follow the organization's currency, which comes from the
// store, so use the useCurrency() hook instead of a module-level helper. A helper here would have to hardcode a
// currency, which is what it used to do ('EUR', locale 'de-DE') - and that is exactly what broke once organizations
// could keep their books in CHF.

export function fmtDate(date: Date | string | undefined | null): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
