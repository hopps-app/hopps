import type { AdminOrganizationDetail, AdminOrganizationRow as GenRow, MonthlyCount } from '@hopps/api-client';

import { apiClient } from '@/services/apiClient';

import type {
    AdminOrganizationRow,
    AdminOrganizationsPage,
    DailyActivity,
    ExtractionBreakdown,
    ExtractionSource,
    LoginActivity,
    MonthlySeries,
    OrganizationDetail,
    OrgAddress,
    OrgMember,
    TokenUsage,
} from './types';

/**
 * Adapter between the generated api-client and the app's own view types.
 *
 * The generated DTOs (`@hopps/api-client`) are the wire contract: every field is
 * optional and dates are `Date`. This module maps them onto the app's stricter
 * `AdminOrganizationRow` / `OrganizationDetail` (nullable, ISO strings) so the
 * components never deal with the wire shape. All backend calls flow through here.
 *
 * `tokenUsage` has no backend yet (Hopps has no per-org AI metering), so it is still
 * mocked here and merged into the detail. Everything else is real.
 */

/** Instant/Date | undefined → ISO string | null, so formatters get a stable shape. */
function toIso(d: Date | undefined): string | null {
    return d ? new Date(d).toISOString() : null;
}

/**
 * The backend `TYPE` enum has bodied constants (each overrides getDisplayString) and no
 * @JsonValue, so it can serialize as an object ({ displayString, ... }) rather than a bare
 * string. Accept either shape and return a plain string label, or null.
 */
function normalizeType(t: unknown): string | null {
    if (t === null || t === undefined) return null;
    if (typeof t === 'string') return t;
    if (typeof t === 'object') {
        const o = t as Record<string, unknown>;
        const v = o.displayString ?? o.name ?? o.value;
        return typeof v === 'string' ? v : null;
    }
    return String(t);
}

function mapRow(r: GenRow): AdminOrganizationRow {
    return {
        id: r.id ?? 0,
        name: r.name ?? '',
        slug: r.slug ?? '',
        contactEmail: r.contactEmail ?? null,
        belegeCount: r.belegeCount ?? 0,
        lastActivityAt: toIso(r.lastActivityAt),
        createdAt: toIso(r.createdAt),
    };
}

function mapAddress(a: AdminOrganizationDetail['address']): OrgAddress | null {
    if (!a) return null;
    return {
        street: a.street ?? null,
        number: a.number ?? null,
        plz: a.plz ?? null,
        city: a.city ?? null,
        additionalLine: a.additionalLine ?? null,
    };
}

function mapMembers(members: AdminOrganizationDetail['members']): OrgMember[] {
    return (members ?? []).map((m, i) => ({
        id: i + 1,
        firstName: m.firstName ?? '',
        lastName: m.lastName ?? '',
        email: m.email ?? '',
    }));
}

/** MOCK — no per-org AI metering backend exists. Deterministic stand-in until it does. */
function mockTokenUsage(id: number): TokenUsage | null {
    const table: Record<number, TokenUsage | null> = {
        1: { total: 184320, services: { openai: 142000, azure: 42320 } },
        2: { total: 12800, services: { openai: 12800 } },
        3: null,
        4: { total: 61440, services: { openai: 38000, azure: 23440 } },
    };
    return table[id] ?? null;
}

const EMPTY_LOGIN_ACTIVITY: LoginActivity = { totalMembers: 0, days: [] };

/**
 * Real per-day active-member counts for one org, from GET /admin/organizations/{id}/login-activity.
 * The backend counts distinct members who made an authenticated request that day (once per member
 * per day), gap-filled over the last 7 days, oldest first. Degrades to an empty window on failure
 * so a chart-endpoint blip can't fail the whole detail page.
 */
async function fetchLoginActivity(id: number): Promise<LoginActivity> {
    try {
        const res = await apiClient.loginActivity(id);
        const days: DailyActivity[] = (res.days ?? []).map((d) => ({
            // The generated client parses `day` to a Date; keep only the calendar date (ISO).
            day: d.day ? new Date(d.day).toISOString().slice(0, 10) : '',
            activeUsers: d.activeUsers ?? 0,
        }));
        return { totalMembers: res.totalMembers ?? 0, days };
    } catch (e) {
        console.error('Failed to load login activity:', e);
        return EMPTY_LOGIN_ACTIVITY;
    }
}

const EMPTY_EXTRACTION_BREAKDOWN: ExtractionBreakdown = { total: 0, counts: {} };

/** The extraction sources the chart knows how to render. Any other wire key is ignored. */
const EXTRACTION_SOURCES: ExtractionSource[] = ['ZUGFERD', 'AI', 'MANUAL'];

/**
 * Real all-time per-source document counts for one org, from
 * GET /admin/organizations/{id}/extraction-breakdown. The backend groups the org's documents by
 * how their data was extracted (ZUGFeRD / Azure AI / manual), folding never-analyzed documents
 * into MANUAL so the counts sum to `total`. The wire `counts` is a string-keyed map; keep only the
 * sources the chart renders. Degrades to an empty breakdown on failure so a chart-endpoint blip
 * can't fail the whole detail page.
 */
async function fetchExtractionBreakdown(id: number): Promise<ExtractionBreakdown> {
    try {
        const res = await apiClient.extractionBreakdown(id);
        const wire = res.counts ?? {};
        const counts: Partial<Record<ExtractionSource, number>> = {};
        for (const source of EXTRACTION_SOURCES) {
            const value = wire[source];
            if (value) counts[source] = value;
        }
        return { total: res.total ?? 0, counts };
    } catch (e) {
        console.error('Failed to load extraction breakdown:', e);
        return EMPTY_EXTRACTION_BREAKDOWN;
    }
}

/** Localised short month labels ending at `now`, oldest first. Fixed de-DE per Klar. */
function monthLabels(count: number, now: number): string[] {
    const fmt = new Intl.DateTimeFormat('de-DE', { month: 'short' });
    const out: string[] = [];
    const d = new Date(now);
    for (let i = count - 1; i >= 0; i--) {
        const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
        // Trim the trailing dot de-DE appends to short months ("Mai." → "Mai").
        out.push(fmt.format(m).replace(/\.$/, ''));
    }
    return out;
}

/** Build a MonthlySeries from raw monthly values (oldest first) + labels. */
function toSeries(values: number[], labels: string[]): MonthlySeries {
    const points = values.map((value, i) => ({ label: labels[i] ?? '', value }));
    const latest = values[values.length - 1] ?? 0;
    const prev = values[values.length - 2];
    const deltaPct = prev && prev > 0 ? (latest - prev) / prev : null;
    return { points, latest, deltaPct };
}

/** Short de-DE month label for one date ("Mai"), dot trimmed. Klar-consistent. */
function monthLabel(d: Date): string {
    return new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(d).replace(/\.$/, '');
}

/**
 * Map the backend document-activity payload (MonthlyCount[], oldest first, gap-filled)
 * onto the chart's MonthlySeries. Labels come from each entry's own month, so the axis
 * stays correct regardless of the backend's window size or the current date.
 */
function toMonthlySeries(months: MonthlyCount[]): MonthlySeries {
    const points = months.map((m) => ({
        label: m.month ? monthLabel(new Date(m.month)) : '',
        value: m.count ?? 0,
    }));
    const latest = points[points.length - 1]?.value ?? 0;
    const prev = points[points.length - 2]?.value;
    const deltaPct = prev && prev > 0 ? (latest - prev) / prev : null;
    return { points, latest, deltaPct };
}

const EMPTY_SERIES: MonthlySeries = { points: [], latest: 0, deltaPct: null };

/**
 * Real per-month uploaded-document (Beleg) counts for one org. Degrades to an empty series
 * on failure rather than rejecting — a chart-endpoint blip must not fail the whole detail page
 * (the org detail comes from a different endpoint), it just renders an empty Beleg chart.
 */
async function fetchDocumentActivity(id: number): Promise<MonthlySeries> {
    try {
        const res = await apiClient.documentActivity(id);
        return toMonthlySeries(res.months ?? []);
    } catch (e) {
        console.error('Failed to load document activity:', e);
        return EMPTY_SERIES;
    }
}

/** MOCK — AI tokens per month, rolling 6 months. Sharp recent ramp, mirrors the mockup. */
function mockTokensPerMonth(id: number, now: number): MonthlySeries {
    const seed = (id % 3) + 1;
    const raw = [1800, 3200, 2600, 5400, 9200, 14200].map((v) => Math.round(v * (0.7 + seed * 0.15)));
    return toSeries(raw, monthLabels(6, now));
}

export async function fetchOrganizations(): Promise<AdminOrganizationsPage> {
    // The admin list endpoint returns all organizations; the UI filters client-side.
    // Revisit if org counts ever grow large enough to need server-side paging.
    const rows = await apiClient.organizationsAll();
    const mapped = rows.map(mapRow);
    return { rows: mapped, total: mapped.length };
}

export async function fetchOrganization(id: number): Promise<OrganizationDetail | null> {
    // Detail, per-month document activity, per-day login activity, and the extraction-source
    // breakdown come from separate endpoints; fetch them in parallel so the detail page is fully
    // populated in one round-trip.
    const [d, belegePerMonth, loginActivity, extractionBreakdown] = await Promise.all([
        apiClient.organizationsGET(id),
        fetchDocumentActivity(id),
        fetchLoginActivity(id),
        fetchExtractionBreakdown(id),
    ]);
    const belegeCount = d.belegeCount ?? 0;
    return {
        id: d.id ?? id,
        name: d.name ?? '',
        slug: d.slug ?? '',
        contactEmail: d.contactEmail ?? null,
        belegeCount,
        lastActivityAt: toIso(d.lastActivityAt),
        createdAt: toIso(d.createdAt),
        type: normalizeType(d.type),
        foundingDate: toIso(d.foundingDate),
        registrationCourt: d.registrationCourt ?? null,
        registrationNumber: d.registrationNumber ?? null,
        taxNumber: d.taxNumber ?? null,
        country: d.country ?? null,
        website: d.website ?? null,
        phoneNumber: d.phoneNumber ?? null,
        address: mapAddress(d.address),
        members: mapMembers(d.members),
        bankImportCount: d.bankImportCount ?? 0,
        tokenUsage: mockTokenUsage(id),
        loginActivity,
        belegePerMonth,
        tokensPerMonth: mockTokensPerMonth(id, Date.now()),
        extractionBreakdown,
    };
}

export async function deleteOrganization(id: number): Promise<void> {
    await apiClient.organizationsDELETE(id);
}
