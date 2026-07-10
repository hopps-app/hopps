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
};
