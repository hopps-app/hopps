import type { DailyActivity, ExtractionSource, MonthlyPoint } from '@/features/organizations/types';
import { apiClient } from '@/services/apiClient';

import { mockDashboard } from './mock';
import type { DashboardOverview, MonthlyExtraction } from './types';

/**
 * Adapter between the generated api-client and the Übersicht's view types, mirroring
 * `features/organizations/api.ts`: the wire shape has everything optional, this hands the
 * components a total one.
 *
 * Unlike the organization detail, nothing here is mocked — every figure is real backend data.
 */

/** The extraction sources the chart renders. Any other wire key is ignored. */
const EXTRACTION_SOURCES: ExtractionSource[] = ['ZUGFERD', 'AI', 'MANUAL'];

/** Short de-DE month label ("Mai"), dot trimmed — same convention as the organization charts. */
function monthLabel(d: Date): string {
    return new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(d).replace(/\.$/, '');
}

/** Keeps only the sources the chart draws; any other wire key is ignored. */
function mapExtractionCounts(wire: { [key: string]: number } | undefined): Partial<Record<ExtractionSource, number>> {
    const counts: Partial<Record<ExtractionSource, number>> = {};
    for (const source of EXTRACTION_SOURCES) {
        counts[source] = wire?.[source] ?? 0;
    }
    return counts;
}

/**
 * Whether to serve the fixture instead of calling the backend. Opt-in per page load via `?mock` in the
 * URL rather than an env var or a build flag, so it cannot be left switched on by accident and needs
 * no rebuild to try.
 */
function mockRequested(): boolean {
    return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('mock');
}

export async function fetchDashboard(): Promise<DashboardOverview> {
    if (mockRequested()) {
        console.warn('Übersicht: showing mock data because ?mock is set in the URL.');
        return mockDashboard();
    }

    const res = await apiClient.dashboard();

    const signupsPerMonth: MonthlyPoint[] = (res.signupsPerMonth ?? []).map((m) => ({
        // The generated client parses `month` to a Date; label it from its own month so the axis
        // stays right regardless of the window size the backend chose.
        label: m.month ? monthLabel(new Date(m.month)) : '',
        value: m.count ?? 0,
    }));

    const activityPerDay: DailyActivity[] = (res.activityPerDay ?? []).map((d) => ({
        // The generated client parses `day` to a Date; keep only the calendar date (ISO).
        day: d.day ? new Date(d.day).toISOString().slice(0, 10) : '',
        activeSeconds: d.activeSeconds ?? 0,
    }));

    const extractionPerMonth: MonthlyExtraction[] = (res.extractionPerMonth ?? []).map((m) => ({
        label: m.month ? monthLabel(new Date(m.month)) : '',
        counts: mapExtractionCounts(m.counts),
    }));

    return {
        totalOrganizations: res.totalOrganizations ?? 0,
        signupsPerMonth,
        activityPerDay,
        // The sparkline only needs the shape, so the days come through as bare values.
        activeOrganizationsPerDay: (res.activeOrganizationsPerDay ?? []).map((d) => d.count ?? 0),
        activeOrganizationsInWindow: res.activeOrganizationsInWindow ?? 0,
        extractionPerMonth,
    };
}
