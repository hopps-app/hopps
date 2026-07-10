/**
 * Absolute date in German convention: `14.05.2026`.
 * hopps is German-first and the Klar design language mandates `dd.mm.yyyy`, so this
 * is fixed to de-DE regardless of the UI language toggle.
 */
export function formatDate(iso: string | null): string | null {
    if (!iso) {
        return null;
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

/** Integer with German grouping (`1.240`). Used for the Belege count. */
export function formatNumber(value: number): string {
    return new Intl.NumberFormat('de-DE').format(value);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Coarse relative time ("vor 3 Tagen"). Used for last-activity, where the exact
 * timestamp matters less than the order of magnitude — the question being answered
 * is "is this org still alive", not "when precisely". Follows the active UI language.
 */
export function formatRelative(iso: string | null, locale: string, now: number): string | null {
    if (!iso) {
        return null;
    }
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) {
        return null;
    }

    const elapsed = now - then;
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (elapsed < HOUR) {
        return rtf.format(-Math.floor(elapsed / MINUTE), 'minute');
    }
    if (elapsed < DAY) {
        return rtf.format(-Math.floor(elapsed / HOUR), 'hour');
    }
    if (elapsed < 30 * DAY) {
        return rtf.format(-Math.floor(elapsed / DAY), 'day');
    }
    if (elapsed < 365 * DAY) {
        return rtf.format(-Math.floor(elapsed / (30 * DAY)), 'month');
    }
    return rtf.format(-Math.floor(elapsed / (365 * DAY)), 'year');
}
