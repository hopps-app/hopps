/** The period the amounts on the bommel page cover: everything, one calendar year, or a free range. */
export type Period = { kind: 'all' } | { kind: 'year'; year: number } | { kind: 'custom'; startDate: string; endDate: string };

/** Inclusive `yyyy-MM-dd` bounds, the format the statistics endpoint expects. A missing bound is open. */
export interface DateRange {
    startDate?: string;
    endDate?: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function currentYearPeriod(today: Date = new Date()): Period {
    return { kind: 'year', year: today.getFullYear() };
}

export function periodToRange(period: Period): DateRange {
    switch (period.kind) {
        case 'year':
            return { startDate: `${period.year}-01-01`, endDate: `${period.year}-12-31` };
        case 'custom':
            return { startDate: period.startDate, endDate: period.endDate };
        default:
            return {};
    }
}

/** A free range needs both days, and the end must not be before the start. */
export function isValidRange(startDate: string, endDate: string): boolean {
    return DATE.test(startDate) && DATE.test(endDate) && startDate <= endDate;
}

/** Years to offer: from the first year with a transaction up to this year, newest first. The selected year stays listed. */
export function yearOptions(firstYear: number | undefined, today: Date = new Date(), selected?: number): number[] {
    const thisYear = today.getFullYear();
    const oldest = Math.min(firstYear ?? thisYear, selected ?? thisYear, thisYear);
    const years: number[] = [];
    for (let year = thisYear; year >= oldest; year--) years.push(year);
    return years;
}

/** Reads a stored period back; anything that does not look like one falls back to the current year. */
export function parsePeriod(raw: unknown, today: Date = new Date()): Period {
    const value = raw as Partial<Period> | null;
    if (value && typeof value === 'object') {
        if (value.kind === 'all') return { kind: 'all' };
        if (value.kind === 'year' && Number.isInteger(value.year)) return { kind: 'year', year: value.year as number };
        if (value.kind === 'custom' && isValidRange(String(value.startDate), String(value.endDate))) {
            return { kind: 'custom', startDate: value.startDate as string, endDate: value.endDate as string };
        }
    }
    return currentYearPeriod(today);
}

/** How the period is named next to the amounts: the year, "all years", or the range as written dates. */
export function periodLabel(period: Period, t: (key: string, options?: Record<string, string>) => string, language: string): string {
    if (period.kind === 'year') return String(period.year);
    if (period.kind === 'all') return t('bommel.period.all');
    const day = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString(language, { day: '2-digit', month: '2-digit', year: 'numeric' });
    return t('bommel.period.range', { from: day(period.startDate), to: day(period.endDate) });
}
