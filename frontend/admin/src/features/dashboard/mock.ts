import type { MonthlyPoint } from '@/features/organizations/types';

import type { DashboardOverview, MonthlyExtraction } from './types';

/**
 * A populated fixture for looking at the Übersicht before real usage exists.
 *
 * The time metric only started collecting when it shipped and there is no backfill, so on a fresh
 * database every chart is a flat zero line and the layout cannot really be judged. This stands in for
 * an estate of a couple of hundred Vereine that has been running for a year.
 *
 * **Not wired into normal loading.** It is returned only when `?mock` is present in the URL, so it can
 * never be mistaken for real data on a deployed dashboard. Delete this file once the real numbers are
 * worth looking at.
 *
 * The figures are internally consistent — the cards derive from these same series, so the deltas and
 * shares they show follow from the numbers below rather than being written twice.
 */

/** Vereine that registered in each of the last 12 months, oldest first. */
const SIGNUPS = [6, 8, 7, 11, 9, 14, 12, 16, 13, 19, 15, 12];

/** Documents uploaded per month, oldest first. */
const BELEGE_TOTAL = [900, 1050, 1180, 1320, 1500, 1680, 1900, 2100, 2320, 2560, 2400, 2840];

/**
 * Documents extracted by Azure per month. The share climbs to a third and then falls back as ZUGFeRD
 * takes over — which is the story the trend chart exists to tell, and it gives the KI card a negative
 * change to render.
 */
const BELEGE_AI = [90, 126, 177, 238, 300, 386, 494, 588, 719, 845, 720, 738];

/** Documents arriving with embedded ZUGFeRD XML per month — the structured path, growing steadily. */
const BELEGE_ZUGFERD = [72, 105, 142, 185, 255, 319, 418, 525, 650, 794, 840, 1136];

/** Seconds in the application per day across the estate, oldest first. Quiet at the weekend. */
const ACTIVE_SECONDS = [21600, 27000, 10800, 32400, 36000, 14400, 30600];

/** Distinct Vereine active on each of those days. */
const ACTIVE_ORGANIZATIONS = [58, 71, 24, 83, 92, 31, 79];

/** Short de-DE month label ("Mai"), dot trimmed — matching the real adapter. */
function monthLabel(d: Date): string {
    return new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(d).replace(/\.$/, '');
}

/** Labels for the last `count` months ending at `now`, oldest first. */
function monthLabels(count: number, now: Date): string[] {
    return Array.from({ length: count }, (_, i) =>
        monthLabel(new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1))
    );
}

/** ISO calendar days for the last `count` days ending today, oldest first. */
function dayKeys(count: number, now: Date): string[] {
    return Array.from({ length: count }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (count - 1 - i));
        return d.toISOString().slice(0, 10);
    });
}

export function mockDashboard(now: Date = new Date()): DashboardOverview {
    const labels = monthLabels(SIGNUPS.length, now);
    const days = dayKeys(ACTIVE_SECONDS.length, now);

    const signupsPerMonth: MonthlyPoint[] = SIGNUPS.map((value, i) => ({ label: labels[i], value }));

    const extractionPerMonth: MonthlyExtraction[] = BELEGE_TOTAL.map((total, i) => ({
        label: labels[i],
        counts: {
            ZUGFERD: BELEGE_ZUGFERD[i],
            AI: BELEGE_AI[i],
            // Whatever is left, so the three sources always account for the month's total exactly.
            MANUAL: total - BELEGE_ZUGFERD[i] - BELEGE_AI[i],
        },
    }));

    return {
        totalOrganizations: 187,
        signupsPerMonth,
        activityPerDay: ACTIVE_SECONDS.map((activeSeconds, i) => ({ day: days[i], activeSeconds })),
        activeOrganizationsPerDay: ACTIVE_ORGANIZATIONS,
        // Distinct over the week, so higher than any single day but well under their sum — plenty of
        // Vereine are active on more than one day.
        activeOrganizationsInWindow: 126,
        extractionPerMonth,
    };
}
