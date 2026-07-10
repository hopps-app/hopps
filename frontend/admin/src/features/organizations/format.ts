/** Absolute date, e.g. "14 Nov 2025". Locale comes from i18next's active language. */
export function formatDate(iso: string | null, locale: string): string | null {
    if (!iso) {
        return null;
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Coarse relative time ("3 days ago"). Used for last-activity, where the exact
 * timestamp matters less than the order of magnitude — the question being answered
 * is "is this org still alive", not "when precisely".
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
