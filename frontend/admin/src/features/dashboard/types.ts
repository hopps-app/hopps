import type { DailyActivity, ExtractionSource, MonthlyPoint } from '@/features/organizations/types';

/**
 * Documents uploaded in one month, split by how their data was extracted.
 * Mirrors the backend `MonthlyExtraction`; every month carries all three sources (missing ones as 0)
 * so each series is a continuous line rather than one with holes in it.
 */
export type MonthlyExtraction = {
    /** Short localised month label, e.g. "Mai". */
    label: string;
    counts: Partial<Record<ExtractionSource, number>>;
};

/**
 * Everything the Übersicht renders, from a single `GET /admin/dashboard`.
 * Mirrors the backend `DashboardResponse`; every figure excludes soft-deleted Vereine.
 */
export type DashboardOverview = {
    /** Vereine that exist right now, not a historical total. */
    totalOrganizations: number;
    /** Registrations per month, oldest first, gap-filled with zeros. */
    signupsPerMonth: MonthlyPoint[];
    /**
     * Time in the application per day across the whole estate, oldest first, gap-filled with zeros.
     * Combined member time, so a day can exceed 24 hours.
     */
    activityPerDay: DailyActivity[];
    /**
     * Distinct Vereine with at least one member active on each day, oldest first. A stricter reading of
     * "active" than the organizations table's badge: did something that day, rather than seen within
     * the last 90 days.
     */
    activeOrganizationsPerDay: number[];
    /**
     * Distinct Vereine active at any point in the window. Not the sum or maximum of the per-day counts —
     * one Verein active on several days still counts once.
     */
    activeOrganizationsInWindow: number;
    /** How the extraction mix moved month by month, oldest first. */
    extractionPerMonth: MonthlyExtraction[];
};
