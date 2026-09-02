import { format } from 'date-fns';
import { de, enUS, uk } from 'date-fns/locale';

export function dateFnsLocale(language: string) {
    switch (language.split('-')[0]) {
        case 'de':
            return de;
        case 'uk':
            return uk;
        default:
            return enUS;
    }
}

export function formatCurrency(language: string, value: number | undefined, currency = 'EUR'): string {
    return new Intl.NumberFormat(language, { style: 'currency', currency }).format(value ?? 0);
}

export function formatMonthLabel(language: string, monthKey: string, withYear: boolean): string {
    const date = new Date(`${monthKey}-01T00:00:00`);
    return format(date, withYear ? 'MMM yy' : 'MMM', { locale: dateFnsLocale(language) });
}

export function formatDay(language: string, apiDate: string): string {
    return format(new Date(`${apiDate}T00:00:00`), 'P', { locale: dateFnsLocale(language) });
}

export type Change = {
    /** Rounded whole percent, always positive — the direction lives in `direction`. */
    percent: number;
    direction: 'up' | 'down' | 'flat';
};

/**
 * Percentage change against the comparison period. Returns null when there is nothing to compare
 * against — a jump from zero has no meaningful percentage.
 */
export function percentageChange(current: number, previous: number): Change | null {
    if (!previous) {
        return null;
    }

    const raw = ((current - previous) / Math.abs(previous)) * 100;
    const percent = Math.round(Math.abs(raw));

    if (percent === 0) {
        return { percent: 0, direction: 'flat' };
    }

    return { percent, direction: raw > 0 ? 'up' : 'down' };
}
