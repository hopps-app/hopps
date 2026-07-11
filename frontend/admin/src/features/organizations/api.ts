import type { AdminOrganizationDetail, AdminOrganizationRow as GenRow } from '@hopps/api-client';

import { apiClient } from '@/services/apiClient';

import type {
    AdminOrganizationRow,
    AdminOrganizationsPage,
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

/**
 * MOCK — sessions-per-hour histogram (30-day average). No login-time metering exists.
 * A fixed office-hours curve (quiet overnight, midday + evening peaks) scaled per org so
 * different orgs read differently but the same org is stable across renders.
 */
function mockLoginActivity(id: number): LoginActivity {
    // Base shape over 24 hours — the mockup's twin-hump profile (midday + a taller evening peak).
    const base = [
        1, 0, 0, 0, 0, 1, 2, 4, 7, 10, 13, 16, 18, 14, 11, 9, 8, 10, 15, 22, 26, 19, 9, 4,
    ];
    const scale = 0.6 + ((id % 5) * 0.2); // 0.6–1.4, deterministic per org
    return { hourly: base.map((v) => Math.round(v * scale)) };
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

/** MOCK — Belege per month, rolling 6 months. Deterministic per org, growth toward latest. */
function mockBelegePerMonth(id: number, now: number): MonthlySeries {
    const seed = (id % 4) + 1;
    const raw = [3, 5, 4, 6, 7, 10].map((v) => v * seed * 16);
    return toSeries(raw, monthLabels(6, now));
}

/** MOCK — AI tokens per month, rolling 6 months. Sharp recent ramp, mirrors the mockup. */
function mockTokensPerMonth(id: number, now: number): MonthlySeries {
    const seed = (id % 3) + 1;
    const raw = [1800, 3200, 2600, 5400, 9200, 14200].map((v) => Math.round(v * (0.7 + seed * 0.15)));
    return toSeries(raw, monthLabels(6, now));
}

export async function fetchOrganizations(): Promise<AdminOrganizationsPage> {
    // The admin list endpoint is paged; the UI loads all and filters client-side,
    // so request a generous first page. Revisit if org counts ever grow large.
    const rows = await apiClient.organizationsAll(0, 100);
    const mapped = rows.map(mapRow);
    return { rows: mapped, total: mapped.length };
}

export async function fetchOrganization(id: number): Promise<OrganizationDetail | null> {
    const d = await apiClient.organizationsGET(id);
    return {
        id: d.id ?? id,
        name: d.name ?? '',
        slug: d.slug ?? '',
        contactEmail: d.contactEmail ?? null,
        belegeCount: d.belegeCount ?? 0,
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
        loginActivity: mockLoginActivity(id),
        belegePerMonth: mockBelegePerMonth(id, Date.now()),
        tokensPerMonth: mockTokensPerMonth(id, Date.now()),
    };
}

export async function deleteOrganization(id: number): Promise<void> {
    await apiClient.organizationsDELETE(id);
}
