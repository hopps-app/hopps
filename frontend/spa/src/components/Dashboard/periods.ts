import { addMonths, endOfMonth, endOfYear, format, startOfMonth, startOfQuarter, startOfYear, subMonths, subYears } from 'date-fns';

export const PERIOD_IDS = ['ytd', 'quarter', 'last6Months', 'last12Months', 'previousYear'] as const;

export type PeriodId = (typeof PERIOD_IDS)[number];

export const DEFAULT_PERIOD: PeriodId = 'ytd';

export type DateRange = {
    /** Inclusive, `yyyy-MM-dd` — the format the org service expects. */
    startDate: string;
    /** Inclusive, `yyyy-MM-dd`. */
    endDate: string;
};

const toApiDate = (date: Date) => format(date, 'yyyy-MM-dd');

export function resolvePeriod(period: PeriodId, today: Date = new Date()): DateRange {
    switch (period) {
        case 'quarter':
            return { startDate: toApiDate(startOfQuarter(today)), endDate: toApiDate(today) };
        case 'last6Months':
            return { startDate: toApiDate(startOfMonth(subMonths(today, 5))), endDate: toApiDate(today) };
        case 'last12Months':
            return { startDate: toApiDate(startOfMonth(subMonths(today, 11))), endDate: toApiDate(today) };
        case 'previousYear': {
            const lastYear = subYears(today, 1);
            return { startDate: toApiDate(startOfYear(lastYear)), endDate: toApiDate(endOfYear(lastYear)) };
        }
        case 'ytd':
        default:
            return { startDate: toApiDate(startOfYear(today)), endDate: toApiDate(today) };
    }
}

/** Year to date — the fixed reference the three KPI cards always show, independent of the chart filters. */
export function currentYearToDate(today: Date = new Date()): DateRange {
    return { startDate: toApiDate(startOfYear(today)), endDate: toApiDate(today) };
}

/**
 * The same span one year earlier. Comparing a part-year against a full previous year would always
 * look like a collapse, so the comparison window ends on the same day of the previous year.
 */
export function sameRangeLastYear(today: Date = new Date()): DateRange {
    const lastYear = subYears(today, 1);
    return { startDate: toApiDate(startOfYear(lastYear)), endDate: toApiDate(lastYear) };
}

/** Every month touched by the range, as `yyyy-MM` keys, so empty months still get a bar slot. */
export function monthKeysInRange({ startDate, endDate }: DateRange): string[] {
    const start = startOfMonth(new Date(`${startDate}T00:00:00`));
    const end = endOfMonth(new Date(`${endDate}T00:00:00`));

    const keys: string[] = [];
    for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 1)) {
        keys.push(format(cursor, 'yyyy-MM'));
    }

    return keys;
}
