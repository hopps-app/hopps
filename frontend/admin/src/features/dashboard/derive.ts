import type { MonthlyPoint } from '@/features/organizations/types';

import type { MonthlyExtraction } from './types';

/**
 * Figures the Kennzahlen cards show that are not sent as such — they fall out of the series the
 * charts already draw, so the backend does not repeat them.
 */

/**
 * Running total of Vereine per month, walked backwards from today's count: the total at the end of a
 * month is the next month's total minus what joined during that next month. The last entry is
 * therefore exactly `total`.
 *
 * Inherits one caveat from the query behind it — soft-deleted Vereine are excluded throughout, so
 * this reads "the Vereine that exist today, by when they joined" rather than how many existed at the
 * time.
 */
export function cumulativeTotals(total: number, months: MonthlyPoint[]): number[] {
    const cumulative: number[] = new Array(months.length);
    let running = total;
    for (let i = months.length - 1; i >= 0; i--) {
        cumulative[i] = running;
        running -= months[i].value;
    }
    return cumulative;
}

/** Documents uploaded per month, summed across the extraction methods. */
export function belegeTotals(months: MonthlyExtraction[]): number[] {
    return months.map((m) => Object.values(m.counts).reduce((sum, v) => sum + (v ?? 0), 0));
}

/** Documents extracted by AI per month. */
export function aiCounts(months: MonthlyExtraction[]): number[] {
    return months.map((m) => m.counts.AI ?? 0);
}

/**
 * Share of each month's documents that were extracted by AI, as a percentage. A month with no
 * documents is 0 rather than undefined, so the series stays drawable.
 */
export function aiSharePercent(months: MonthlyExtraction[]): number[] {
    const totals = belegeTotals(months);
    return aiCounts(months).map((ai, i) => (totals[i] > 0 ? (ai / totals[i]) * 100 : 0));
}

/** Last entry of a series, or 0 when there is none. */
export function latest(series: number[]): number {
    return series[series.length - 1] ?? 0;
}

/** Second-to-last entry, or 0 — the value the latest one is compared against. */
export function previous(series: number[]): number {
    return series[series.length - 2] ?? 0;
}

/**
 * Month-over-month change as a fraction, or null when the previous month was zero. A percentage
 * against a zero baseline is either infinite or meaningless, and the caller shows nothing instead.
 */
export function monthOverMonth(series: number[]): number | null {
    const prev = previous(series);
    return prev > 0 ? (latest(series) - prev) / prev : null;
}
