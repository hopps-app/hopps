/**
 * One row of the admin organizations table.
 *
 * This is the contract the eventual `GET /organization` admin endpoint must satisfy.
 * It is deliberately a flat, read-optimised projection — not the `Organization`
 * entity — because a row needs values the entity does not store:
 *
 *  - `contactEmail`   joins through the org's member (Organization has no owner concept)
 *  - `belegeCount`    a COUNT over the org's transactions
 *  - `lastActivityAt` MAX(lastSeenAt) across members — needs a `last_seen_at` column,
 *                     or Keycloak's login events. Does not exist yet.
 *  - `createdAt`      when the record appeared in Hopps. Does not exist yet;
 *                     `Organization.foundingDate` is the Verein's *legal* founding
 *                     date and must not be substituted for it.
 *
 * The two fields that do not exist yet are nullable so the table can render honestly
 * once the endpoint lands but before the migrations do.
 *
 * `Verein` is the German domain word shown in the UI (via i18n); the code and this
 * type use `Organization` to match the backend entity.
 */
export type AdminOrganizationRow = {
    id: number;
    name: string;
    slug: string;
    /** Email of the member attached to this org. Not an "owner" — no such concept exists yet. */
    contactEmail: string | null;
    /** Number of transactions (Belege) belonging to this org. */
    belegeCount: number;
    /** Most recent member activity, ISO-8601. Null when never seen, or not yet implemented. */
    lastActivityAt: string | null;
    /** When the org was registered in Hopps, ISO-8601. Null until the column exists. */
    createdAt: string | null;
};

export type AdminOrganizationsPage = {
    rows: AdminOrganizationRow[];
    /** Total across all pages, for pagination. */
    total: number;
};

/** Postal address, mirrors the backend `Address` embeddable. */
export type OrgAddress = {
    street: string | null;
    number: string | null;
    plz: string | null;
    city: string | null;
    additionalLine: string | null;
};

/** A member of the organization. Mirrors the backend `Member` (firstName, lastName, email). */
export type OrgMember = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
};

/** AI providers Hopps can bill usage against. `services` on TokenUsage keys off these. */
export type AiService = 'openai' | 'azure';

/**
 * Per-organization AI token usage. MOCK ONLY — Hopps has no per-org metering today
 * (only OpenAI's global account quota). Structured now so a real metering backend
 * can populate it later without changing the view.
 */
export type TokenUsage = {
    total: number;
    /** Breakdown by provider. Sums to `total`. */
    services: Partial<Record<AiService, number>>;
};

/**
 * Activity for a single day: how many distinct members were active (made an authenticated
 * request) on `day`. Mirrors the backend `DailyActivity` record.
 */
export type DailyActivity = {
    /** ISO calendar day, e.g. "2026-07-05". */
    day: string;
    /** Number of distinct members active that day. */
    activeUsers: number;
};

/**
 * Per-day active-member counts over the retention window (last 7 days, oldest first,
 * gap-filled with zeros), plus the org's total member count for a ratio display.
 * Mirrors the backend `LoginActivityResponse` from GET /admin/organizations/{id}/login-activity.
 */
export type LoginActivity = {
    /** Total members of the organization — the denominator for "N of M active". */
    totalMembers: number;
    /** One entry per day, oldest first. Length is the window (7). */
    days: DailyActivity[];
};

/** One month in a rolling monthly series, `label` already localised for display. */
export type MonthlyPoint = {
    /** Short month label, e.g. "Mai". */
    label: string;
    value: number;
};

/**
 * A rolling monthly series with a month-over-month delta.
 * MOCK ONLY — same caveat as LoginActivity: no per-org time-series metering exists yet.
 */
export type MonthlySeries = {
    points: MonthlyPoint[];
    /** value of the most recent month (points[last].value), surfaced for the headline. */
    latest: number;
    /** Change vs the previous month as a fraction (0.23 = +23%). Null if no prior month. */
    deltaPct: number | null;
};

/**
 * Full detail projection for one organization — everything the detail page shows.
 * Extends the list row with Stammdaten, address, and activity counts.
 * Same caveat as the row: this is the contract for a future `GET /organization/{id}`
 * admin endpoint, not the raw entity.
 */
export type OrganizationDetail = AdminOrganizationRow & {
    // Stammdaten (registration / legal)
    type: string | null;
    foundingDate: string | null;
    registrationCourt: string | null;
    registrationNumber: string | null;
    taxNumber: string | null;
    country: string | null;
    website: string | null;
    // Kontakt
    phoneNumber: string | null;
    address: OrgAddress | null;
    // Members of the organization
    members: OrgMember[];
    // Aktivität
    bankImportCount: number;
    /** MOCK — see TokenUsage. Null if never used any AI service. */
    tokenUsage: TokenUsage | null;
    /** MOCK — sessions-per-hour histogram (30-day average). See LoginActivity. */
    loginActivity: LoginActivity;
    /** MOCK — Belege created per month, rolling 6 months. */
    belegePerMonth: MonthlySeries;
    /** MOCK — AI tokens consumed per month, rolling 6 months. */
    tokensPerMonth: MonthlySeries;
};
