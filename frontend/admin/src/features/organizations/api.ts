import type { AdminOrganizationDetail, AdminOrganizationRow as GenRow, MonthlyCount } from '@hopps/api-client';

import { apiClient } from '@/services/apiClient';

import type {
    AdminOrganizationRow,
    AdminOrganizationsPage,
    DailyActivity,
    ExtractionBreakdown,
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

/**
 * MOCK — no admin endpoint aggregates Document.extractionSource yet. Deterministic per-org
 * stand-in: splits the org's document total across the three extraction methods with a
 * plausible ZUGFeRD-heavy distribution (structured/electronic invoices dominate). `total`
 * is passed in so the split matches the Belege count shown elsewhere on the page.
 */
function mockExtractionBreakdown(id: number, total: number): ExtractionBreakdown {
    if (total <= 0) {
        return { total: 0, counts: {} };
    }
    // Weights vary a little per org but stay ZUGFeRD > AI > manual. Sum ~= 1.
    const zugferdShare = 0.5 + ((id % 3) * 0.05); // 0.50–0.60
    const manualShare = 0.06 + ((id % 4) * 0.02); // 0.06–0.12
    const zugferd = Math.round(total * zugferdShare);
    const manual = Math.round(total * manualShare);
    const ai = Math.max(0, total - zugferd - manual); // remainder, so the three sum to `total`
    return { total, counts: { ZUGFERD: zugferd, AI: ai, MANUAL: manual } };
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

/**
 * MOCK — per-day distinct active members over the last 7 days (oldest first), mirroring
 * GET /admin/organizations/{id}/login-activity. The real endpoint exists in the backend but
 * is not yet in the generated api-client, so this deterministic stand-in fills the shape until
 * the client is regenerated. Counts are clamped to a plausible per-org member total.
 */
const LOGIN_WINDOW_DAYS = 7;
function mockLoginActivity(id: number, now: number): LoginActivity {
    const totalMembers = 4 + (id % 6); // 4–9, deterministic per org
    // A weekly rhythm: quieter at the weekend edges, busier midweek. Deterministic per org.
    const shape = [2, 3, 4, 5, 4, 1, 1];
    const bias = id % 3; // shifts the curve so different orgs read differently
    const today = new Date(now);
    const days: DailyActivity[] = [];
    for (let i = LOGIN_WINDOW_DAYS - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const raw = shape[(LOGIN_WINDOW_DAYS - 1 - i + bias) % LOGIN_WINDOW_DAYS];
        days.push({
            day: d.toISOString().slice(0, 10),
            activeUsers: Math.min(totalMembers, raw),
        });
    }
    return { totalMembers, days };
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
    // Detail and the per-month document activity come from separate endpoints; fetch both
    // in parallel so the detail page has a fully-populated model in one round-trip.
    const [d, belegePerMonth] = await Promise.all([apiClient.organizationsGET(id), fetchDocumentActivity(id)]);
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
        loginActivity: mockLoginActivity(id, Date.now()),
        belegePerMonth,
        tokensPerMonth: mockTokensPerMonth(id, Date.now()),
        extractionBreakdown: mockExtractionBreakdown(id, belegeCount),
    };
}

export async function deleteOrganization(id: number): Promise<void> {
    await apiClient.organizationsDELETE(id);
}
